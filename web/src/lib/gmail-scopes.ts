export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"
export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"

export function accountHasGmailSend(scope: string | null | undefined): boolean {
  return Boolean(scope?.includes("gmail.send"))
}

export function accountHasGmailReadonly(scope: string | null | undefined): boolean {
  return Boolean(scope?.includes("gmail.readonly"))
}

export function accountHasFullGmailAccess(scope: string | null | undefined): boolean {
  return accountHasGmailSend(scope) && accountHasGmailReadonly(scope)
}

export function formatGmailAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("insufficient authentication scopes")) {
    return "Reconnect Google to enable reply tracking. Sign out, then sign in again with Google."
  }
  if (
    lower.includes("invalid_grant") ||
    lower.includes("revoked") ||
    lower.includes("token has been expired")
  ) {
    return "Gmail access was revoked — sign in again to reconnect."
  }
  if (lower.includes("no refresh token")) {
    return "Gmail is not connected — sign in with Google again."
  }
  if (lower.includes("gmail.readonly")) {
    return "Gmail reply tracking needs inbox read access. Reconnect Google."
  }
  if (lower.includes("gmail.send")) {
    return "Gmail send permission is missing. Reconnect Google."
  }
  return message
}
