import "server-only"

import { openai, OPENAI_MODEL } from "@/lib/openai"
import { parseResumeExtraction, type ResumeExtraction } from "@/lib/resume-extract"

const EXTRACTION_PROMPT = `You are a resume parser. Extract structured candidate information from the resume text provided.

Return ONLY a valid JSON object with this exact schema:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "city": string | null,
  "current_position": string | null,
  "years_experience": number | null,
  "education": string[],
  "work_experience": [
    {
      "title": string,
      "company": string,
      "description": string,
      "start_month": string | null,
      "start_year": string | null,
      "end_month": string | null,
      "end_year": string | null,
      "is_current": boolean
    }
  ],
  "skills": string[],
  "summary": string | null,
  "certifications": string[],
  "linkedin_url": string | null,
  "portfolio_url": string | null,
  "github_url": string | null,
  "confidence": "high" | "medium" | "low"
}

Example work_experience entry:
{
  "title": "Senior Software Engineer",
  "company": "Acme Corp",
  "description": "Led migration to microservices. Reduced API latency by 40%. Mentored 3 engineers.",
  "start_month": "03",
  "start_year": "2021",
  "end_month": null,
  "end_year": null,
  "is_current": true
}

Rules:
- Only extract information explicitly present in the resume. Do not guess or infer.
- work_experience: one object per role. Same company with different titles = separate entries.
- title = job title only. company = employer name only. description = responsibilities and achievements only — NEVER repeat the title or company in description.
- start_month / end_month: two-digit strings "01" through "12", or null if unknown.
- start_year / end_year: four-digit year strings e.g. "2019", or null if unknown.
- is_current: true only for the role the candidate currently holds. When is_current is true, end_month and end_year must be null.
- Order work_experience most recent first.
- For years_experience, calculate from work history dates if stated; otherwise null.
- education: array of PLAIN STRINGS only, never objects — one formatted string per degree/program, e.g. "Massachusetts Institute of Technology — B.S. Computer Science (2018)". Do not return {"institution": ..., "degree": ...} objects.
- skills: short skill strings only (e.g. "React", "Python").
- city: the candidate's current city only, not full address.
- confidence: "high" if most key fields found, "medium" if partial, "low" if very little extractable.
- Use null for missing fields, empty arrays for missing lists.`

export async function extractResumeFields(resumeText: string): Promise<ResumeExtraction | null> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      { role: "user", content: `Resume text:\n\n${resumeText.slice(0, 12000)}` },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) return null

  try {
    const parsed = JSON.parse(content)
    return parseResumeExtraction(parsed)
  } catch {
    return null
  }
}
