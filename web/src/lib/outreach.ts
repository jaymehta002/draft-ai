import { createHash } from "crypto"

export type DraftResult = {
  detected_name: string
  is_hiring_relevant: boolean
  action_mode: "EMAIL" | "DM"
  outreach_payload: {
    subject_line: string | null
    message_content: string
  }
}

export function getProfileVersion(updatedAt: Date): string {
  return createHash("sha256").update(updatedAt.toISOString()).digest("hex").slice(0, 16)
}

export function draftResultToResponse(draft: {
  id: string
  recipientName: string | null
  actionMode: string
  subject: string | null
  message: string
  draftResponse: unknown
}, cached: boolean) {
  const stored = draft.draftResponse as DraftResult
  return {
    success: true,
    cached,
    draftId: draft.id,
    data: stored,
  }
}
