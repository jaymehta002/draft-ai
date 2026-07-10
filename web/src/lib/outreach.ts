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

export function parseDraftResult(raw: unknown): DraftResult | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const payload = r.outreach_payload
  if (!payload || typeof payload !== "object") return null
  const p = payload as Record<string, unknown>
  if (typeof p.message_content !== "string") return null
  if (r.action_mode !== "EMAIL" && r.action_mode !== "DM") return null
  return normalizeDraftResult(raw as DraftResult)
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
  const stored = parseDraftResult(draft.draftResponse)
  if (!stored) {
    throw new Error("Invalid stored draft response")
  }
  return {
    success: true,
    cached,
    draftId: draft.id,
    data: stored,
  }
}
