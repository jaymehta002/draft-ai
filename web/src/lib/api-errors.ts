import { getWebErrorMessage, type WebErrorCode } from "@/lib/error-messages"

export type ApiErrorPayload = {
  code?: string
  error?: string
  retryAfterSeconds?: number
  feature?: "draft" | "email" | "follow_up" | "insight"
  upgradeUrl?: string
  details?: unknown
}

export async function readApiError(res: Response): Promise<ApiErrorPayload> {
  try {
    const json = (await res.json()) as ApiErrorPayload
    return json ?? {}
  } catch {
    return {}
  }
}

export function mapApiErrorToWebCode(status: number, payload: ApiErrorPayload): WebErrorCode {
  const code = payload.code

  if (status === 429 || code === "rate_limited") return "rate_limited"
  if (status === 402 || code === "limit_reached" || code === "feature_locked") return "limit_reached"
  if (status === 401) return "session_expired"
  if (code === "invalid_api_key") return "invalid_api_key"
  if (code === "invalid_state") return "invalid_state"
  if (code === "expired_state") return "expired_state"
  if (code === "already_connected") return "already_connected"
  if (code === "onboarding_incomplete") return "onboarding_incomplete"
  if (code === "ai_no_response") return "ai_no_response"

  if (status >= 500) return "server_error"
  return "unknown"
}

export function toUserErrorMessage(status: number, payload: ApiErrorPayload): string {
  const mapped = mapApiErrorToWebCode(status, payload)
  if (mapped === "rate_limited") {
    return getWebErrorMessage(mapped, { retryAfterSeconds: payload.retryAfterSeconds })
  }
  if (mapped === "limit_reached") {
    return getWebErrorMessage(mapped, { feature: payload.feature })
  }
  return getWebErrorMessage(mapped)
}

