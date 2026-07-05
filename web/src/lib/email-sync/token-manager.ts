/**
 * token-manager.ts
 *
 * Securely retrieves a valid Gmail access token for a user, managing:
 *  - Reading the refresh token from the NextAuth Account table
 *  - Encrypting and caching it in MailboxSync for our sync service
 *  - Refreshing the access token when expired
 *  - Graceful error handling for revoked / invalid grants
 */

import { google } from "googleapis"
import { prisma } from "@/lib/prisma"
import { encryptToken, decryptToken, isEncrypted } from "@/lib/crypto"

export type TokenResult =
  | { ok: true; accessToken: string; oauth2Client: InstanceType<typeof google.auth.OAuth2> }
  | { ok: false; error: string }

/**
 * Returns a valid OAuth2 client pre-loaded with credentials for `userId`.
 * Stores an encrypted copy of the refresh token in MailboxSync on first call.
 */
export async function getGmailOAuth2Client(userId: string): Promise<TokenResult> {
  // 1. Try to find an encrypted refresh token in MailboxSync first
  let mailboxSync = await prisma.mailboxSync.findUnique({ where: { userId } })

  let refreshToken: string | null = null

  if (mailboxSync?.encryptedRefreshToken) {
    try {
      refreshToken = isEncrypted(mailboxSync.encryptedRefreshToken)
        ? decryptToken(mailboxSync.encryptedRefreshToken)
        : mailboxSync.encryptedRefreshToken
    } catch {
      // Decryption failed — fall through to Account lookup
      refreshToken = null
    }
  }

  // 2. Fall back to the NextAuth Account table
  if (!refreshToken) {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { refresh_token: true },
    })
    refreshToken = account?.refresh_token ?? null
  }

  if (!refreshToken) {
    return { ok: false, error: "No refresh token available for this user. Please sign in again." }
  }

  // 3. Persist encrypted copy to MailboxSync if not already there
  const encryptionEnabled = !!process.env.ENCRYPTION_KEY
  if (encryptionEnabled) {
    try {
      const encryptedRefreshToken = encryptToken(refreshToken)
      if (mailboxSync) {
        if (mailboxSync.encryptedRefreshToken !== encryptedRefreshToken) {
          await prisma.mailboxSync.update({
            where: { userId },
            data: { encryptedRefreshToken, syncError: null },
          })
        }
      } else {
        mailboxSync = await prisma.mailboxSync.create({
          data: { userId, provider: "gmail", encryptedRefreshToken },
        })
      }
    } catch {
      // Encryption not configured — still proceed without encrypted storage
    }
  } else if (!mailboxSync) {
    mailboxSync = await prisma.mailboxSync.create({
      data: { userId, provider: "gmail" },
    })
  }

  // 4. Build an OAuth2 client and verify it can get an access token
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  try {
    const { token } = await oauth2Client.getAccessToken()
    if (!token) {
      throw new Error("Empty access token returned")
    }
    return { ok: true, accessToken: token, oauth2Client }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isRevoked =
      msg.includes("invalid_grant") ||
      msg.includes("Token has been expired") ||
      msg.includes("revoked")

    const syncError = isRevoked
      ? "Gmail access has been revoked. Please sign in again to reconnect."
      : `Token refresh failed: ${msg}`

    await prisma.mailboxSync.updateMany({
      where: { userId },
      data: { syncError },
    })

    return { ok: false, error: syncError }
  }
}
