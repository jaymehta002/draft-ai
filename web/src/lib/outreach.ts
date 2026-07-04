import { createHash } from "crypto"

export type DraftResult = {
  detected_name: string
  is_hiring_relevant: boolean
  match_score: number
  match_reason: string
  fit_highlights: string[]
  action_mode: "EMAIL" | "DM"
  outreach_payload: {
    subject_line: string | null
    message_content: string
  }
}

export function getProfileVersion(updatedAt: Date): string {
  return createHash("sha256").update(updatedAt.toISOString()).digest("hex").slice(0, 16)
}

export function normalizeDraftResult(result: DraftResult): DraftResult {
  const numericMatchScore =
    typeof result.match_score === "number" && Number.isFinite(result.match_score)
      ? result.match_score
      : result.is_hiring_relevant
        ? 82
        : 36

  return {
    ...result,
    match_score: Math.max(0, Math.min(100, Math.round(numericMatchScore))),
    match_reason:
      typeof result.match_reason === "string" && result.match_reason.trim()
        ? result.match_reason.trim()
        : result.is_hiring_relevant
          ? "Candidate profile aligns with the opportunity."
          : "Opportunity appears less aligned with the candidate profile.",
    fit_highlights: Array.isArray(result.fit_highlights)
      ? result.fit_highlights
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .slice(0, 3)
      : [],
  }
}

export function draftResultToResponse(draft: {
  id: string
  recipientName: string | null
  actionMode: string
  subject: string | null
  message: string
  draftResponse: unknown
}, cached: boolean) {
  const stored = normalizeDraftResult(draft.draftResponse as DraftResult)
  return {
    success: true,
    cached,
    draftId: draft.id,
    data: stored,
  }
}
