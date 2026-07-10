import {
  API_BASE_URL,
  AUTH_STORAGE_KEYS,
  type AuthState,
} from "./config"

export async function getAuthState(): Promise<AuthState | null> {
  const result = await chrome.storage.local.get([
    AUTH_STORAGE_KEYS.apiKey,
    AUTH_STORAGE_KEYS.userEmail,
    AUTH_STORAGE_KEYS.userName,
    AUTH_STORAGE_KEYS.connectedAt,
  ])

  if (!result[AUTH_STORAGE_KEYS.apiKey] || !result[AUTH_STORAGE_KEYS.userEmail]) {
    return null
  }

  return {
    apiKey: result[AUTH_STORAGE_KEYS.apiKey],
    userEmail: result[AUTH_STORAGE_KEYS.userEmail],
    userName: result[AUTH_STORAGE_KEYS.userName] ?? null,
    connectedAt: result[AUTH_STORAGE_KEYS.connectedAt] ?? new Date().toISOString(),
  }
}

export async function saveAuthState(auth: AuthState): Promise<void> {
  await chrome.storage.local.set({
    [AUTH_STORAGE_KEYS.apiKey]: auth.apiKey,
    [AUTH_STORAGE_KEYS.userEmail]: auth.userEmail,
    [AUTH_STORAGE_KEYS.userName]: auth.userName,
    [AUTH_STORAGE_KEYS.connectedAt]: auth.connectedAt,
  })
  await chrome.storage.local.remove(AUTH_STORAGE_KEYS.pendingConnectState)
}

export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove([
    AUTH_STORAGE_KEYS.apiKey,
    AUTH_STORAGE_KEYS.userEmail,
    AUTH_STORAGE_KEYS.userName,
    AUTH_STORAGE_KEYS.connectedAt,
    AUTH_STORAGE_KEYS.pendingConnectState,
  ])
}

export async function verifyAuthState(): Promise<AuthState | null> {
  const auth = await getAuthState()
  if (!auth) return null

  try {
    const response = await fetch(`${API_BASE_URL}/api/extension/status`, {
      headers: {
        Authorization: `Bearer ${auth.apiKey}`,
      },
    })

    if (response.status === 401) {
      await clearAuthState()
      return null
    }

    if (!response.ok) {
      return auth
    }

    const data = await response.json()

    if (!data.valid) {
      await clearAuthState()
      return null
    }

    const updatedAuth: AuthState = {
      ...auth,
      userEmail: data.email ?? auth.userEmail,
      userName: data.name ?? auth.userName,
    }

    await saveAuthState(updatedAuth)
    return updatedAuth
  } catch {
    return auth
  }
}

export function generateConnectState(): string {
  return crypto.randomUUID()
}
