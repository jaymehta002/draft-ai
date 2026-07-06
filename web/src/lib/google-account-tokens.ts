import type { Account } from "next-auth"
import { prisma } from "@/lib/prisma"

type GoogleOAuthAccount = Pick<
  Account,
  | "provider"
  | "providerAccountId"
  | "refresh_token"
  | "access_token"
  | "expires_at"
  | "scope"
  | "token_type"
  | "id_token"
>

/** Fields NextAuth receives on OAuth callback but does not persist for returning users. */
export function buildGoogleAccountTokenUpdate(account: GoogleOAuthAccount) {
  const data: Record<string, string | number> = {}

  if (account.refresh_token) data.refresh_token = account.refresh_token
  if (account.access_token) data.access_token = account.access_token
  if (account.expires_at) data.expires_at = account.expires_at
  if (account.scope) data.scope = account.scope
  if (account.token_type) data.token_type = account.token_type
  if (account.id_token) data.id_token = account.id_token

  return data
}

/**
 * NextAuth v4 only writes Account tokens on first link. Re-consent returns fresh
 * tokens in the callback — persist them here so Gmail sync gets updated scopes.
 */
export async function persistGoogleAccountOnSignIn(
  userId: string,
  account: GoogleOAuthAccount
) {
  if (account.provider !== "google" || !account.providerAccountId) return

  const data = buildGoogleAccountTokenUpdate(account)
  if (Object.keys(data).length === 0) return

  await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: account.providerAccountId,
      },
    },
    data,
  })

  await prisma.mailboxSync.updateMany({
    where: { userId },
    data: { encryptedRefreshToken: null, syncError: null },
  })
}

/** Clears a stale refresh token so the next Google sign-in must issue a new one. */
export async function clearStaleGoogleRefreshToken(userId: string) {
  await prisma.account.updateMany({
    where: { userId, provider: "google" },
    data: { refresh_token: null },
  })
}
