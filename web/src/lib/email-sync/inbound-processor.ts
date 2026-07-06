/**
 * inbound-processor.ts
 *
 * Orchestrates the full inbound sync pipeline for a single user:
 *   1. Resolves a valid OAuth2 client via token-manager
 *   2. Fetches known Gmail threadIds from the DB (for sync filtering)
 *   3. Calls gmail-sync to get new messages since the last historyId
 *   4. For each new message, runs the thread-matcher
 *   5. Upserts EmailMessage rows and updates EmailThread metadata
 *   6. Auto-updates SentOutreach.responseReceivedAt on first inbound reply
 *   7. Advances the MailboxSync cursor
 */

import { formatGmailAuthError, accountHasGmailReadonly } from "@/lib/gmail-scopes"
import { clearStaleGoogleRefreshToken } from "@/lib/google-account-tokens"
import { prisma } from "@/lib/prisma"
import { getGmailSyncClient } from "./token-manager"
import { syncGmailInbox } from "./gmail-sync"
import { matchThread, normalizeSubject } from "./thread-matcher"
import { incrementReplyStats } from "@/lib/user-stats"

export interface ProcessResult {
  ok: boolean
  userId: string
  newMessages: number
  error?: string
}

export async function processInboundForUser(userId: string): Promise<ProcessResult> {
  // 1. Get a valid OAuth2 client
  const tokenResult = await getGmailSyncClient(userId)
  if (!tokenResult.ok) {
    return { ok: false, userId, newMessages: 0, error: tokenResult.error }
  }

  // 2. Fetch all known Gmail threadIds for this user
  const knownOutreach = await prisma.sentOutreach.findMany({
    where: { userId, gmailThreadId: { not: null } },
    select: { gmailThreadId: true },
  })
  const knownGmailThreadIds = new Set(
    knownOutreach.map((o) => o.gmailThreadId!).filter(Boolean)
  )

  // Also include threadIds from existing EmailMessages
  const knownMsgThreads = await prisma.emailMessage.findMany({
    where: { userId, providerThreadId: { not: null } },
    select: { providerThreadId: true },
    distinct: ["providerThreadId"],
  })
  knownMsgThreads.forEach((m) => {
    if (m.providerThreadId) knownGmailThreadIds.add(m.providerThreadId)
  })

  // 3. Load last sync cursor
  const mailboxSync = await prisma.mailboxSync.findUnique({ where: { userId } })
  const lastHistoryId = mailboxSync?.gmailHistoryId ?? null

  // 4. Run Gmail sync
  let syncResult
  try {
    syncResult = await syncGmailInbox(
      tokenResult.oauth2Client,
      lastHistoryId,
      knownGmailThreadIds
    )
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const error = formatGmailAuthError(raw)

    if (raw.toLowerCase().includes("insufficient authentication scopes")) {
      const account = await prisma.account.findFirst({
        where: { userId, provider: "google" },
        select: { scope: true },
      })
      if (accountHasGmailReadonly(account?.scope)) {
        await clearStaleGoogleRefreshToken(userId)
      }
    }

    await prisma.mailboxSync.upsert({
      where: { userId },
      create: { userId, provider: "gmail", syncError: error },
      update: { syncError: error, updatedAt: new Date() },
    })
    return { ok: false, userId, newMessages: 0, error }
  }

  const { messages, newHistoryId } = syncResult
  let savedCount = 0

  // 5. Process each message
  for (const msg of messages) {
    try {
      // Skip if already stored
      const existing = await prisma.emailMessage.findUnique({
        where: { userId_providerMsgId: { userId, providerMsgId: msg.providerMsgId } },
      })
      if (existing) continue

      // Find or create a thread
      let threadId = await matchThread(userId, msg)
      let isNewThread = false

      if (!threadId) {
        // No match — create an orphaned thread (not linked to any outreach)
        const newThread = await prisma.emailThread.create({
          data: {
            userId,
            subject: normalizeSubject(msg.subject) || msg.subject || "(no subject)",
            participantEmail: extractEmail(msg.fromAddress),
            lastMessageAt: msg.receivedAt,
            isRead: false,
            messageCount: 0,
          },
        })
        threadId = newThread.id
        isNewThread = true
      }

      // Upsert the EmailMessage row
      await prisma.emailMessage.create({
        data: {
          threadId,
          userId,
          direction: "INBOUND",
          fromAddress: msg.fromAddress,
          toAddresses: JSON.stringify(msg.toAddresses),
          subject: msg.subject,
          snippet: msg.snippet,
          rawBody: msg.rawBody,
          rfcMessageId: msg.rfcMessageId,
          inReplyTo: msg.inReplyTo,
          references: msg.references,
          providerMsgId: msg.providerMsgId,
          providerThreadId: msg.providerThreadId,
          isRead: false,
          receivedAt: msg.receivedAt,
        },
      })

      // Update thread metadata
      await prisma.emailThread.update({
        where: { id: threadId },
        data: {
          lastMessageAt: msg.receivedAt,
          isRead: false,
          messageCount: { increment: 1 },
        },
      })

      // Auto-set responseReceivedAt on the linked SentOutreach (first reply only)
      const thread = await prisma.emailThread.findUnique({
        where: { id: threadId },
        select: { sentOutreachId: true },
      })
      if (thread?.sentOutreachId && !isNewThread) {
        const updateResult = await prisma.sentOutreach.updateMany({
          where: {
            id: thread.sentOutreachId,
            responseReceivedAt: null,
          },
          data: {
            responseReceivedAt: msg.receivedAt,
            responseSource: "GMAIL_SYNC",
          },
        })
        if (updateResult.count > 0) {
          await incrementReplyStats(userId)
        }
      }

      savedCount++
    } catch (msgErr) {
      // Log but don't abort the whole sync on a single message failure
      console.error(`[inbound-processor] Failed to process message ${msg.providerMsgId}:`, msgErr)
    }
  }

  // 6. Advance the sync cursor
  await prisma.mailboxSync.upsert({
    where: { userId },
    create: {
      userId,
      provider: "gmail",
      gmailHistoryId: newHistoryId ?? undefined,
      syncError: null,
      lastSyncedAt: new Date(),
    },
    update: {
      gmailHistoryId: newHistoryId ?? undefined,
      syncError: null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    },
  })

  return { ok: true, userId, newMessages: savedCount }
}

/** Extracts a bare email address from "Display Name <addr>" or plain "addr". */
function extractEmail(address: string): string {
  const match = address.match(/<([^>]+)>/)
  return (match ? match[1] : address).trim().toLowerCase()
}
