/**
 * thread-matcher.ts
 *
 * Links an incoming email to an existing EmailThread using a 3-priority cascade:
 *
 *   Priority 1 — Gmail native thread ID match (most reliable for Gmail users)
 *   Priority 2 — RFC 2822 In-Reply-To / References header match
 *   Priority 3 — Normalized subject-line match within 30 days
 *   Priority 4 — Sender email match within 14 days (weakest, last resort)
 *
 * Returns the matched threadId or null (caller creates a new thread).
 */

import { prisma } from "@/lib/prisma"
import type { ParsedMessage } from "./gmail-sync"

/** Strips "Re:", "Fwd:", "AW:", and other reply prefixes (case-insensitive, repeated). */
export function normalizeSubject(subject: string | null): string {
  if (!subject) return ""
  return subject
    .replace(/^(re|fwd?|aw|sv|tr|rés?):\s*/gi, "")
    .trim()
    .toLowerCase()
}

/**
 * Attempts to match an incoming message to an existing thread for `userId`.
 * Returns the matched `threadId` or `null`.
 */
export async function matchThread(
  userId: string,
  msg: ParsedMessage
): Promise<string | null> {
  // ── Priority 1: Gmail native threadId ─────────────────────────────────────
  // Check if we have a SentOutreach with this exact Gmail threadId
  if (msg.providerThreadId) {
    const outreach = await prisma.sentOutreach.findFirst({
      where: { userId, gmailThreadId: msg.providerThreadId },
      select: { emailThread: { select: { id: true } } },
    })
    if (outreach?.emailThread?.id) {
      return outreach.emailThread.id
    }

    // Also check EmailMessage table (for threads where the outbound msg is stored)
    const existingMsg = await prisma.emailMessage.findFirst({
      where: { userId, providerThreadId: msg.providerThreadId },
      select: { threadId: true },
    })
    if (existingMsg?.threadId) {
      return existingMsg.threadId
    }
  }

  // ── Priority 2: RFC 2822 In-Reply-To / References header ──────────────────
  const replyToIds: string[] = []
  if (msg.inReplyTo) replyToIds.push(msg.inReplyTo.trim())
  if (msg.references) {
    // References is a space-separated list of Message-IDs, most recent last
    const refIds = msg.references
      .split(/\s+/)
      .map((id) => id.trim())
      .filter(Boolean)
    replyToIds.push(...refIds)
  }

  if (replyToIds.length > 0) {
    const matchedMsg = await prisma.emailMessage.findFirst({
      where: {
        userId,
        rfcMessageId: { in: replyToIds },
      },
      select: { threadId: true },
      orderBy: { receivedAt: "desc" },
    })
    if (matchedMsg?.threadId) {
      return matchedMsg.threadId
    }
  }

  // ── Priority 3: Subject-line normalization within 30 days ─────────────────
  const normalizedIncoming = normalizeSubject(msg.subject)
  if (normalizedIncoming) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const thread = await prisma.emailThread.findFirst({
      where: {
        userId,
        lastMessageAt: { gte: thirtyDaysAgo },
        // PostgreSQL ILIKE for case-insensitive match
        subject: { contains: normalizedIncoming, mode: "insensitive" },
      },
      select: { id: true },
      orderBy: { lastMessageAt: "desc" },
    })
    if (thread?.id) {
      return thread.id
    }
  }

  // ── Priority 4: Sender email within 14 days ───────────────────────────────
  if (msg.fromAddress) {
    // Extract just the email address from "Name <email>" format
    const emailMatch = msg.fromAddress.match(/<([^>]+)>/) || [null, msg.fromAddress]
    const senderEmail = emailMatch[1]?.trim().toLowerCase()

    if (senderEmail) {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      const thread = await prisma.emailThread.findFirst({
        where: {
          userId,
          participantEmail: { equals: senderEmail, mode: "insensitive" },
          lastMessageAt: { gte: fourteenDaysAgo },
        },
        select: { id: true },
        orderBy: { lastMessageAt: "desc" },
      })
      if (thread?.id) {
        return thread.id
      }
    }
  }

  return null
}
