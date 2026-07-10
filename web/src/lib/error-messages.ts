export type WebErrorCode =
  | "unknown"
  | "offline"
  | "network_error"
  | "server_error"
  | "rate_limited"
  | "limit_reached"
  | "unauthorized"
  | "session_expired"
  | "invalid_api_key"
  | "invalid_state"
  | "expired_state"
  | "already_connected"
  | "onboarding_incomplete"
  | "resume_upload_failed"
  | "resume_read_failed"
  | "resume_empty"
  | "resume_unsupported_type"
  | "save_progress_failed"
  | "complete_onboarding_failed"
  | "draft_generate_failed"
  | "ai_no_response"
  | "billing_status_failed"
  | "checkout_failed"
  | "billing_portal_failed"
  | "profile_export_failed"
  | "profile_save_failed"
  | "account_delete_failed"
  | "email_send_unavailable"
  | "invalid_recipient_email"
  | "missing_subject_or_body"
  | "missing_post_id"
  | "sync_failed"
  | "gmail_reconnect_required"
  | "gmail_revoked"
  | "gmail_not_connected"
  | "gmail_missing_read_access"
  | "gmail_missing_send_access"

export type WebErrorMessageParams = {
  retryAfterSeconds?: number
  feature?: "draft" | "email" | "follow_up" | "insight"
}

const MESSAGES: Record<WebErrorCode, (p?: WebErrorMessageParams) => string> = {
  unknown: () => "We couldn’t complete that request. Please try again.",
  offline: () => "You’re offline. Reconnect and try again.",
  network_error: () => "We couldn’t reach Draft AI. Check your connection and try again.",
  server_error: () => "Draft AI ran into a problem on our end. Please try again.",
  rate_limited: (p) =>
    typeof p?.retryAfterSeconds === "number" && p.retryAfterSeconds > 0
      ? `Too many requests right now. Try again in ${p.retryAfterSeconds}s.`
      : "Too many requests right now. Try again in a moment.",
  limit_reached: (p) =>
    p?.feature === "email"
      ? "Monthly email limit reached. Upgrade to keep sending."
      : p?.feature
        ? `Monthly ${p.feature.replace(/_/g, " ")} limit reached. Upgrade to continue.`
        : "Monthly limit reached. Upgrade to continue.",
  unauthorized: () => "You must be signed in to continue.",
  session_expired: () => "Your session expired. Sign in again to continue.",
  invalid_api_key: () => "Your extension key is invalid. Reconnect the extension from the dashboard.",
  invalid_state: () => "This connection link was already used or has timed out. Start again from the extension.",
  expired_state: () => "This connection link was already used or has timed out. Start again from the extension.",
  already_connected: () => "This extension is already linked to your account.",
  onboarding_incomplete: () =>
    "Finish setting up your Draft AI profile, then reopen the extension to connect.",
  resume_upload_failed: () => "We couldn’t upload your resume. Please try again.",
  resume_read_failed: () => "We couldn’t read that file. Please try again.",
  resume_empty: () => "That file looks empty. Please upload a different file.",
  resume_unsupported_type: () => "Unsupported file type. Upload a PDF or plain text (.txt, .md).",
  save_progress_failed: () => "We couldn’t save your progress. Please try again.",
  complete_onboarding_failed: () => "We couldn’t complete setup. Please try again.",
  draft_generate_failed: () => "We couldn’t generate a draft. Please try again.",
  ai_no_response: () => "Draft AI didn’t get a response from the AI model. Please try again.",
  billing_status_failed: () => "We couldn’t load your billing status. Please try again.",
  checkout_failed: () => "We couldn’t start checkout. Please try again.",
  billing_portal_failed: () => "We couldn’t open the billing portal. Please try again.",
  profile_export_failed: () => "We couldn’t export your data. Please try again.",
  profile_save_failed: () => "We couldn’t save your profile. Please try again.",
  account_delete_failed: () => "We couldn’t delete your account. Please try again.",
  email_send_unavailable: () => "This draft can’t be sent as an email.",
  invalid_recipient_email: () => "Enter a valid recipient email address.",
  missing_subject_or_body: () => "Add a subject and message body to send this email.",
  missing_post_id: () => "This draft is missing a post ID. Please draft again from the post.",
  sync_failed: () => "Sync failed. Please try again.",
  gmail_reconnect_required: () =>
    "Reconnect Google to enable reply tracking. Sign out, then sign in again with Google.",
  gmail_revoked: () => "Gmail access was revoked. Sign in again to reconnect.",
  gmail_not_connected: () => "Gmail isn’t connected. Sign in with Google again.",
  gmail_missing_read_access: () => "Gmail reply tracking needs inbox read access. Reconnect Google.",
  gmail_missing_send_access: () => "Gmail send permission is missing. Reconnect Google.",
}

export function getWebErrorMessage(code: WebErrorCode, params?: WebErrorMessageParams) {
  return MESSAGES[code](params)
}

