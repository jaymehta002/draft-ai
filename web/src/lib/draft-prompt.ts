export type OutreachPreferences = {
  outreachTone?: string | null
  draftLength?: string | null
  outreachLanguage?: string | null
}

export type DraftProfileContext = {
  fullName?: string | null
  currentTitle?: string | null
  yearsExperience?: number | null
  location?: string | null
  skills?: string | null
  summary?: string | null
  workExperience?: string | null
  education?: string | null
  desiredRoles?: string | null
  salaryExpectation?: string | null
  workPreference?: string | null
  resumeContent?: string | null
}

export type DraftPostContext = {
  text: string
  name?: string | null
  extractedEmail?: string | null
  emailRecipientName?: string | null
  hasEmail?: boolean
}

const TONE_GUIDE: Record<string, string> = {
  professional: "professional and polished, but still personable",
  warm: "warm, friendly, and conversational",
  direct: "direct and concise — get to the point quickly",
  formal: "formal and respectful, suitable for senior executives",
}

const LENGTH_GUIDE: Record<string, string> = {
  short: "about 80 words",
  medium: "about 150 words",
  long: "about 250 words",
}

const LANGUAGE_GUIDE: Record<string, string> = {
  en: "English",
}

const INDUSTRY_OVERRIDES: Record<string, string> = {
  "software-engineering":
    "Reference specific stack, tools, or technical challenges mentioned in the post. Tie the candidate's engineering experience to concrete problems the team likely faces.",
  "product-management":
    "Lead with user impact, metrics, and cross-functional collaboration. Show understanding of product tradeoffs mentioned in the post.",
  design:
    "Reference design craft, user empathy, and portfolio-relevant work. Connect visual/UX decisions to outcomes the poster cares about.",
  "data-science":
    "Highlight analytical rigor, model impact, and data-driven decisions. Reference datasets, methods, or business metrics when relevant.",
  marketing:
    "Emphasize growth outcomes, audience understanding, and campaign results. Mirror the poster's language around brand or funnel metrics.",
  sales:
    "Be concise about revenue impact, pipeline experience, and relationship building. Match the poster's energy without sounding pushy.",
  operations:
    "Focus on process improvement, scale, and cross-team coordination. Reference operational challenges implied in the post.",
}

export function buildDraftSystemPrompt(
  profile: DraftProfileContext,
  post: DraftPostContext,
  preferences: OutreachPreferences = {},
  industryTag?: string | null
): string {
  const tone = preferences.outreachTone || "professional"
  const length = preferences.draftLength || "medium"
  const language = preferences.outreachLanguage || "en"
  const industryGuide =
    industryTag && INDUSTRY_OVERRIDES[industryTag]
      ? `\nIndustry-specific guidance:\n- ${INDUSTRY_OVERRIDES[industryTag]}`
      : ""

  const normalizedExtractedEmail = post.extractedEmail || "None"
  const resolvedEmailRecipientName = post.emailRecipientName || "Unknown"

  return `
You are an expert career coach helping a job candidate draft a highly personalized outreach message in response to a job-related social media post.

Candidate profile:
- Name: ${profile.fullName || "Unknown"}
- Current title: ${profile.currentTitle || "N/A"}
- Years of experience: ${profile.yearsExperience ?? "N/A"}
- Location: ${profile.location || "N/A"}
- Skills: ${profile.skills || "N/A"}
- Summary: ${profile.summary || "N/A"}
- Work experience: ${profile.workExperience || "N/A"}
- Education: ${profile.education || "N/A"}
- Desired roles: ${profile.desiredRoles || "N/A"}
- Salary expectation: ${profile.salaryExpectation || "N/A"}
- Work location preference: ${profile.workPreference || "N/A"}
- Resume highlights: ${profile.resumeContent?.slice(0, 2000) || "N/A"}

Writing preferences:
- Tone: Write in a ${TONE_GUIDE[tone] || TONE_GUIDE.professional} tone.
- Length: Target ${LENGTH_GUIDE[length] || LENGTH_GUIDE.medium}.
- Language: Write in ${LANGUAGE_GUIDE[language] || LANGUAGE_GUIDE.en}.${industryGuide}

Post / opportunity context:
- Poster name: ${post.name || "Unknown"}
- Extracted recipient email: ${normalizedExtractedEmail}
- Email addressee inferred from the email address: ${resolvedEmailRecipientName}
- Post text: "${post.text}"

Instructions:
1. Determine if the post is relevant for this candidate (is_hiring_relevant). E.g. hiring post, job opening, recruiter looking for their stack, or networking opportunity.
2. Provide a match_score from 0-100 that reflects how well the opportunity fits the candidate profile.
3. Write a short match_reason (max 20 words) explaining the score.
4. Provide 2-3 fit_highlights as short phrases grounded in the candidate profile or post context.
5. Determine the action_mode. If an email is present, action_mode must be "EMAIL". Otherwise, it must be "DM".
6. Draft the outreach_payload from the candidate's perspective — expressing interest, highlighting relevant experience/skills, and showing genuine engagement with what the poster wrote.
7. If EMAIL, the greeting must follow the recipient email, not automatically the social post author.
8. If EMAIL and the email addressee inferred from the email address is known, address that person by name.
9. If EMAIL and the email addressee is unknown or uncertain, start with a generic greeting like "Hello" and do not guess or invent a person's name.
10. If DM, subject_line should be null, and message_content should be shorter and punchier.
11. Return ONLY a valid JSON object matching this schema exactly:
{
  "detected_name": string,
  "is_hiring_relevant": boolean,
  "match_score": number,
  "match_reason": string,
  "fit_highlights": string[],
  "action_mode": "EMAIL" | "DM",
  "outreach_payload": {
    "subject_line": string | null,
    "message_content": string
  }
}
`.trim()
}

export const SAMPLE_POST_TEXT =
  "Just shipped our realtime collab feature! Proud of how the team handled conflict resolution and offline merges. Hiring 2 senior engineers who've worked on distributed systems — DM or email alex@acmecorp.com"
