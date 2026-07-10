export type ExtensionErrorCode =
  | "unknown"
  | "not_signed_in"
  | "session_expired"
  | "invalid_state"
  | "expired_state"
  | "rate_limited"
  | "offline_queued"
  | "limit_reached"
  | "draft_failed"
  | "send_failed"
  | "record_failed"
  | "variant_failed"
  | "mark_replied_failed"
  | "context_invalid"
  | "insufficient_post_text"
  | "invalid_recipient_email"
  | "email_send_unavailable"
  | "open_dashboard_failed"

export type ExtensionErrorMessageParams = {
  retryAfterSeconds?: number
  platform?: "LINKEDIN" | "X" | "UNKNOWN"
  feature?: "draft" | "email" | "follow_up" | "insight"
}

const MESSAGES: Record<ExtensionErrorCode, (p?: ExtensionErrorMessageParams) => string> = {
  unknown: () => "Something went wrong. Please try again.",
  not_signed_in: () => "Sign in from the extension popup to continue.",
  session_expired: () => "Your session expired. Sign in again from the extension popup.",
  invalid_state: () => "This connection link was already used or has timed out. Start again from the extension.",
  expired_state: () => "This connection link was already used or has timed out. Start again from the extension.",
  rate_limited: (p) =>
    typeof p?.retryAfterSeconds === "number" && p.retryAfterSeconds > 0
      ? `Too many requests right now. Try again in ${p.retryAfterSeconds}s.`
      : "Too many requests right now. Try again in a moment.",
  offline_queued: () => "Queued to retry when you’re back online.",
  limit_reached: (p) =>
    p?.feature === "email"
      ? "Monthly email limit reached. Upgrade to keep sending."
      : p?.feature
        ? `Monthly ${p.feature.replace(/_/g, " ")} limit reached. Upgrade to continue.`
        : "Monthly limit reached. Upgrade to continue.",
  draft_failed: () => "Couldn’t build the draft. Please try again.",
  send_failed: () => "Couldn’t send the email. Please try again.",
  record_failed: () => "Couldn’t record that outreach. Please try again.",
  variant_failed: () => "Couldn’t generate a variant. Please try again.",
  mark_replied_failed: () => "Couldn’t mark as replied. Please try again.",
  context_invalid: () => "Draft AI updated. Refresh this page to continue.",
  insufficient_post_text: (p) =>
    p?.platform === "LINKEDIN"
      ? "Couldn't read enough of this post. Click “See more” to expand it, then click Draft again."
      : "Couldn't read enough of this post to draft a message.",
  invalid_recipient_email: () => "Enter a valid recipient email before sending.",
  email_send_unavailable: () => "Email send is unavailable for this draft.",
  open_dashboard_failed: () => "Couldn’t open the dashboard. Please try again.",
}

export function getExtensionErrorMessage(code: ExtensionErrorCode, params?: ExtensionErrorMessageParams) {
  return MESSAGES[code](params)
}

