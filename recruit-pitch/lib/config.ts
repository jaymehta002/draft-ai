export const WEB_URL = process.env.PLASMO_PUBLIC_WEB_URL || "http://localhost:3000"
export const API_BASE_URL = WEB_URL

export const AUTH_MESSAGE_TYPE = "RECRUIT_PITCH_AUTH"

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
