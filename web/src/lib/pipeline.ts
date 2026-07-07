import { getEmailLifecycleState, getOutreachLifecycleState } from "@/lib/outreach-state"

export type PipelineColumn = "drafted" | "sent" | "awaiting" | "replied"

const AWAITING_THRESHOLD_DAYS = 3

export function getPipelineColumnForOutreach(
  sentAt: Date,
  responseReceivedAt: Date | null | undefined
): PipelineColumn {
  if (responseReceivedAt) return "replied"

  const daysSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince >= AWAITING_THRESHOLD_DAYS) return "awaiting"

  const lifecycle = getEmailLifecycleState(sentAt, responseReceivedAt)
  if (lifecycle === "RESPONDED") return "replied"
  if (lifecycle === "AGED") return "awaiting"
  return "sent"
}

export function getPipelineColumnForDraft(hasSentOutreach: boolean): PipelineColumn {
  return hasSentOutreach ? "sent" : "drafted"
}

export function isFollowUpEligible(sentAt: Date, responseReceivedAt: Date | null | undefined): {
  eligible: boolean
  followUpType: "bump" | "close" | null
} {
  if (responseReceivedAt) return { eligible: false, followUpType: null }

  const daysSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince >= 7) return { eligible: true, followUpType: "close" }
  if (daysSince >= 3) return { eligible: true, followUpType: "bump" }
  return { eligible: false, followUpType: null }
}

export const PIPELINE_COLUMN_LABELS: Record<PipelineColumn, string> = {
  drafted: "Drafted",
  sent: "Started",
  awaiting: "Awaiting",
  replied: "Replied",
}

export { getOutreachLifecycleState }
