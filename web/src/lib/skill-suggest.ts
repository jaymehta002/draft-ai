import "server-only"

import { z } from "zod"
import { openai, OPENAI_MODEL } from "@/lib/openai"

export const SkillSuggestionSchema = z.object({
  confirmed: z.array(z.string()),
  suggested: z.array(z.string()),
})

export type SkillSuggestion = z.infer<typeof SkillSuggestionSchema>

const SKILL_PROMPT = `You are a career advisor. Suggest relevant professional skills for a candidate based on their role and experience.

Return ONLY a valid JSON object:
{
  "confirmed": string[],
  "suggested": string[]
}

Rules:
- confirmed: skills strongly associated with this role and experience level (8-12 items max)
- suggested: additional skills that may be relevant but you're less certain about (4-8 items max)
- Each skill is a short string (1-3 words), e.g. "React", "System Design", "Team Leadership"
- Do not duplicate skills between confirmed and suggested
- Base suggestions on the role title and years of experience provided`

export function parseSkillSuggestion(raw: unknown): SkillSuggestion | null {
  const result = SkillSuggestionSchema.safeParse(raw)
  return result.success ? result.data : null
}

export async function suggestSkills(
  currentTitle: string,
  yearsExperience: string,
  existingSkills: string[] = []
): Promise<SkillSuggestion | null> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SKILL_PROMPT },
      {
        role: "user",
        content: `Role: ${currentTitle}\nYears of experience: ${yearsExperience || "unknown"}\nExisting skills from resume: ${existingSkills.join(", ") || "none"}`,
      },
    ],
    response_format: { type: "json_object" },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) return null

  try {
    return parseSkillSuggestion(JSON.parse(content))
  } catch {
    return null
  }
}
