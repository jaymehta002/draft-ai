export type EmailLifecycleState = "SENT" | "AGED" | "RESPONDED"

const AGED_THRESHOLD_DAYS = 7

export function getEmailLifecycleState(
  sentAt: Date,
  responseReceivedAt: Date | null | undefined
): EmailLifecycleState {
  if (responseReceivedAt) return "RESPONDED"

  const daysSince = (Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince >= AGED_THRESHOLD_DAYS) return "AGED"

  return "SENT"
}

/** Lifecycle state for any outreach channel (email or DM). */
export function getOutreachLifecycleState(
  sentAt: Date | string,
  responseReceivedAt: Date | string | null | undefined
): EmailLifecycleState {
  const sent = typeof sentAt === "string" ? new Date(sentAt) : sentAt
  const replied = responseReceivedAt
    ? typeof responseReceivedAt === "string"
      ? new Date(responseReceivedAt)
      : responseReceivedAt
    : null
  return getEmailLifecycleState(sent, replied)
}

export const EMAIL_STATE_LABELS: Record<EmailLifecycleState, string> = {
  SENT: "Sent",
  AGED: "Aged",
  RESPONDED: "Responded",
}
