const isProd = process.env.NODE_ENV === "production"
const configuredWebUrl = process.env.PLASMO_PUBLIC_WEB_URL

if (isProd && !configuredWebUrl) {
  throw new Error("PLASMO_PUBLIC_WEB_URL must be set in production builds")
}

export const WEB_URL = configuredWebUrl || "http://localhost:3000"
export const API_BASE_URL = WEB_URL

export const AUTH_MESSAGE_TYPE = "RECRUIT_PITCH_AUTH"
export const EXTENSION_PING_TYPE = "DRAFT_AI_EXTENSION_PING"
export const EXTENSION_PONG_TYPE = "DRAFT_AI_EXTENSION_PONG"

export type AuthState = {
  apiKey: string
  userEmail: string
  userName: string | null
  connectedAt: string
}

export const AUTH_STORAGE_KEYS = {
  apiKey: "apiKey",
  userEmail: "userEmail",
  userName: "userName",
  connectedAt: "connectedAt",
  pendingConnectState: "pendingConnectState",
  enabled: "enabled",
} as const
