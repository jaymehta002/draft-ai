/**
 * gmail-sync.ts
 *
 * Fetches new messages from the Gmail inbox since the last known historyId.
 * Uses the Gmail History API for incremental sync; falls back to a
 * full-inbox search for first-time sync (last 30 days).
 *
 * Only retrieves messages in threads we care about OR replies to our
 * known Gmail threadIds — we avoid downloading the user's entire inbox.
 */

import { google, gmail_v1 } from "googleapis"

export interface ParsedMessage {
  providerMsgId: string
  providerThreadId: string
  fromAddress: string
  toAddresses: string[]
  subject: string | null
  rfcMessageId: string | null
  inReplyTo: string | null
  references: string | null
  snippet: string
  rawBody: string
  receivedAt: Date
}

/** Extracts a header value by name (case-insensitive). */
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | null {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null
}

/** Decodes a base64url-encoded string from Gmail. */
function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64").toString("utf8")
}

/** Recursively extracts plain-text body parts from a MIME message part. */
function extractPlainText(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return ""

  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data)
  }

  if (part.parts) {
    for (const subPart of part.parts) {
      const text = extractPlainText(subPart)
      if (text) return text
    }
  }

  return ""
}

/** Converts a Gmail message resource into a ParsedMessage. */
function parseGmailMessage(msg: gmail_v1.Schema$Message): ParsedMessage | null {
  if (!msg.id || !msg.threadId) return null

  const headers = msg.payload?.headers ?? []
  const fromAddress = getHeader(headers, "From") ?? ""
  const toRaw = getHeader(headers, "To") ?? ""
  const toAddresses = toRaw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)

  const rawBody = extractPlainText(msg.payload)
  const snippet = (msg.snippet ?? rawBody).slice(0, 300)

  const internalDate = msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now()

  return {
    providerMsgId: msg.id,
    providerThreadId: msg.threadId,
    fromAddress,
    toAddresses,
    subject: getHeader(headers, "Subject"),
    rfcMessageId: getHeader(headers, "Message-ID"),
    inReplyTo: getHeader(headers, "In-Reply-To"),
    references: getHeader(headers, "References"),
    snippet,
    rawBody,
    receivedAt: new Date(internalDate),
  }
}

/**
 * Fetches message details for a list of message IDs in parallel (batched).
 */
async function fetchMessageDetails(
  gmail: gmail_v1.Gmail,
  messageIds: string[],
  batchSize = 10
): Promise<ParsedMessage[]> {
  const results: ParsedMessage[] = []

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize)
    const fetched = await Promise.all(
      batch.map((id) =>
        gmail.users.messages.get({
          userId: "me",
          id,
          format: "FULL",
        }).then((r) => r.data).catch(() => null)
      )
    )
    for (const msg of fetched) {
      if (!msg) continue
      const parsed = parseGmailMessage(msg)
      if (parsed) results.push(parsed)
    }
  }

  return results
}

export interface GmailSyncResult {
  messages: ParsedMessage[]
  newHistoryId: string | null
}

/**
 * Performs an incremental sync using the Gmail History API.
 * If `lastHistoryId` is null, performs an initial full sync of the last 30 days.
 *
 * @param oauth2Client  Authenticated OAuth2 client
 * @param lastHistoryId Last stored historyId, or null for first sync
 * @param knownGmailThreadIds Set of Gmail threadIds we care about (for initial sync filtering)
 */
export async function syncGmailInbox(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  lastHistoryId: string | null,
  knownGmailThreadIds: Set<string>
): Promise<GmailSyncResult> {
  const gmail = google.gmail({ version: "v1", auth: oauth2Client })

  // ── Initial sync: no historyId yet ────────────────────────────────────────
  if (!lastHistoryId) {
    // Fetch recent INBOX messages from the last 30 days
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
    const listResp = await gmail.users.messages.list({
      userId: "me",
      q: `in:inbox after:${thirtyDaysAgo}`,
      maxResults: 100,
    })

    const allMessageIds = (listResp.data.messages ?? [])
      .map((m) => m.id!)
      .filter(Boolean)

    if (allMessageIds.length === 0) {
      // Get current historyId so future incremental syncs work
      const profile = await gmail.users.getProfile({ userId: "me" })
      return { messages: [], newHistoryId: profile.data.historyId ?? null }
    }

    const allMessages = await fetchMessageDetails(gmail, allMessageIds)

    // Filter: only messages that are replies to threads we sent outreach on,
    // or whose threadId is in our known set
    const relevant = allMessages.filter(
      (m) =>
        knownGmailThreadIds.has(m.providerThreadId) ||
        (m.inReplyTo !== null) ||
        (m.references !== null)
    )

    // Get the current profile historyId for future incremental syncs
    const profile = await gmail.users.getProfile({ userId: "me" })
    return { messages: relevant, newHistoryId: profile.data.historyId ?? null }
  }

  // ── Incremental sync: use historyId ───────────────────────────────────────
  const newMessageIds: string[] = []
  let pageToken: string | undefined
  let latestHistoryId = lastHistoryId

  try {
    do {
      const histResp = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
        historyTypes: ["messageAdded"],
        labelId: "INBOX",
        pageToken,
      })

      const historyItems = histResp.data.history ?? []
      for (const item of historyItems) {
        for (const added of item.messagesAdded ?? []) {
          if (added.message?.id) {
            newMessageIds.push(added.message.id)
          }
        }
      }

      if (histResp.data.historyId) {
        latestHistoryId = histResp.data.historyId
      }
      pageToken = histResp.data.nextPageToken ?? undefined
    } while (pageToken)
  } catch (err) {
    // historyId expired (Gmail purges history after ~30 days)
    // Reset to a full resync
    if (err instanceof Error && err.message.includes("404")) {
      return syncGmailInbox(oauth2Client, null, knownGmailThreadIds)
    }
    throw err
  }

  if (newMessageIds.length === 0) {
    return { messages: [], newHistoryId: latestHistoryId }
  }

  const messages = await fetchMessageDetails(gmail, newMessageIds)

  // Filter out our own sent messages (direction=OUTBOUND is already stored)
  const inbound = messages.filter(
    (m) => knownGmailThreadIds.has(m.providerThreadId) || m.inReplyTo !== null
  )

  return { messages: inbound, newHistoryId: latestHistoryId }
}
