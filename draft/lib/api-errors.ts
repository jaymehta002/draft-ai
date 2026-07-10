import type { ExtensionErrorCode, ExtensionErrorMessageParams } from "~lib/error-messages"

export type ExtensionApiErrorPayload = {
  code?: string
  error?: string
  retryAfterSeconds?: number
  feature?: "draft" | "email" | "follow_up" | "insight"
  upgradeUrl?: string
  details?: unknown
}

export async function readApiError(res: Response): Promise<ExtensionApiErrorPayload> {
  try {
    const json = (await res.json()) as ExtensionApiErrorPayload
    return json
  } catch {
    return {}
  }
}

export function mapApiErrorToExtensionCode(
  status: number,
  payload: ExtensionApiErrorPayload,
  fallback: ExtensionErrorCode
): { code: ExtensionErrorCode; params?: ExtensionErrorMessageParams; limitReached?: boolean } {
  if (status === 429 || payload.code === "rate_limited") {
    return {
      code: "rate_limited",
      params: { retryAfterSeconds: payload.retryAfterSeconds },
    }
  }

  if (status === 402 || payload.code === "limit_reached" || payload.code === "feature_locked") {
    return {
      code: "limit_reached",
      params: { feature: payload.feature },
      limitReached: true,
    }
  }

  if (status === 401) {
    return { code: "session_expired" }
  }

  if (payload.code === "invalid_state") return { code: "invalid_state" }
  if (payload.code === "expired_state") return { code: "expired_state" }
  if (payload.code === "invalid_recipient_email") return { code: "invalid_recipient_email" }
  if (payload.code === "email_send_unavailable") return { code: "email_send_unavailable" }
  if (payload.code === "gmail_not_connected") return { code: "email_send_unavailable" }

  return { code: fallback }
}
