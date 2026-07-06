/**
 * token-manager.ts
 *
 * Resolves Gmail OAuth credentials from the NextAuth Account table (single source
 * of truth). MailboxSync stores sync cursor state only — not refresh tokens.
 */

import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { clearStaleGoogleRefreshToken } from "@/lib/google-account-tokens"
import {
  accountHasGmailReadonly,
  accountHasGmailSend,
  formatGmailAuthError,
} from "@/lib/gmail-scopes"

export type TokenResult =
  | { ok: true; accessToken: string; oauth2Client: InstanceType<typeof google.auth.OAuth2> }
  | { ok: false; error: string }

export type GmailTokenMode = "send" | "sync"

async function ensureMailboxSyncRow(userId: string) {
  await prisma.mailboxSync.upsert({
    where: { userId },
    create: { userId, provider: "gmail" },
    update: {},
  })
}

async function setSyncError(userId: string, error: string) {
  await prisma.mailboxSync.upsert({
    where: { userId },
    create: { userId, provider: "gmail", syncError: error },
    update: { syncError: error },
  })
}

async function clearSyncError(userId: string) {
  await prisma.mailboxSync.updateMany({
    where: { userId },
    data: { syncError: null },
  })
}

function validateScopes(
  scope: string | null | undefined,
  mode: GmailTokenMode
): string | null {
  if (mode === "send" && !accountHasGmailSend(scope)) {
    return "Gmail send permission is missing. Reconnect Google to send emails."
  }
  if (mode === "sync" && !accountHasGmailReadonly(scope)) {
    return "Gmail reply tracking needs inbox read access. Reconnect Google."
  }
  return null
}

/**
 * Returns a valid OAuth2 client for Gmail API calls.
 * Always reads refresh_token from Account — never from MailboxSync cache.
 */
export async function getGmailOAuth2Client(
  userId: string,
  mode: GmailTokenMode = "sync"
): Promise<TokenResult> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { refresh_token: true, scope: true },
  })

  if (!account?.refresh_token) {
    const error = "No refresh token available for this user. Please sign in again."
    if (mode === "sync") await setSyncError(userId, error)
    return { ok: false, error }
  }

  const scopeError = validateScopes(account.scope, mode)
  if (scopeError) {
    if (mode === "sync") await setSyncError(userId, scopeError)
    return { ok: false, error: scopeError }
  }

  await ensureMailboxSyncRow(userId)

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ refresh_token: account.refresh_token })

  try {
    const { token } = await oauth2Client.getAccessToken()
    if (!token) {
      throw new Error("Empty access token returned")
    }
    await clearSyncError(userId)
    return { ok: true, accessToken: token, oauth2Client }
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const syncError = formatGmailAuthError(raw)

    if (
      mode === "sync" &&
      raw.toLowerCase().includes("insufficient authentication scopes") &&
      accountHasGmailReadonly(account.scope)
    ) {
      await clearStaleGoogleRefreshToken(userId)
    }

    await setSyncError(userId, syncError)

    return { ok: false, error: syncError }
  }
}

export function getGmailSendClient(userId: string) {
  return getGmailOAuth2Client(userId, "send")
}

export function getGmailSyncClient(userId: string) {
  return getGmailOAuth2Client(userId, "sync")
}
