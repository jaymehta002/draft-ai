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
  "past_companies": string[],
  "skills": string[],
  "summary": string | null,
  "certifications": string[],
  "linkedin_url": string | null,
  "portfolio_url": string | null,
  "github_url": string | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- Only extract information explicitly present in the resume. Do not guess or infer.
- For years_experience, calculate from work history dates if stated; otherwise null.
- past_companies: list employers with role and dates when available, one entry per company.
- education: one entry per degree/program with institution and year if available.
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
