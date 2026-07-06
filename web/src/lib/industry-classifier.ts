export type IndustryTag =
  | "software-engineering"
  | "product-management"
  | "design"
  | "data-science"
  | "marketing"
  | "sales"
  | "operations"
  | "general"

const INDUSTRY_KEYWORDS: Record<IndustryTag, string[]> = {
  "software-engineering": [
    "engineer", "developer", "software", "backend", "frontend", "fullstack",
    "devops", "sre", "typescript", "python", "react", "node", "kubernetes",
  ],
  "product-management": [
    "product manager", "pm", "product lead", "roadmap", "prd", "user research",
  ],
  design: [
    "designer", "ux", "ui", "figma", "visual design", "product design",
  ],
  "data-science": [
    "data scientist", "ml engineer", "machine learning", "analytics", "sql",
  ],
  marketing: [
    "marketing", "growth", "content", "seo", "brand", "campaign",
  ],
  sales: [
    "sales", "account executive", "bdr", "sdr", "revenue",
  ],
  operations: [
    "operations", "ops", "program manager", "chief of staff",
  ],
  general: [],
}

export function classifyIndustry(input: {
  postText?: string | null
  desiredRoles?: string | null
  skills?: string | null
}): IndustryTag {
  const haystack = [
    input.postText,
    input.desiredRoles,
    input.skills,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  if (!haystack.trim()) return "general"

  let bestTag: IndustryTag = "general"
  let bestScore = 0

  for (const [tag, keywords] of Object.entries(INDUSTRY_KEYWORDS) as [IndustryTag, string[]][]) {
    if (tag === "general") continue
    const score = keywords.reduce((acc, kw) => (haystack.includes(kw) ? acc + 1 : acc), 0)
    if (score > bestScore) {
      bestScore = score
      bestTag = tag
    }
  }

  return bestTag
}
