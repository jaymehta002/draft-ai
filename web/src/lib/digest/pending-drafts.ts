import { prisma } from "@/lib/prisma"
import { getWeekKey } from "@/lib/engagement"

const WEB_URL = process.env.NEXTAUTH_URL || "https://draftai.app"
const DIGEST_COOLDOWN_DAYS = 7
const INACTIVITY_DAYS = 3

export async function sendPendingDraftDigests() {
  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000)
  const digestCooldown = new Date(Date.now() - DIGEST_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)

  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      engagement: { select: { lastActivityAt: true, lastDigestSentAt: true } },
    },
    take: 500,
  })

  let sent = 0
  let processed = 0

  for (const user of users) {
    if (!user.email) continue
    processed++

    const lastActivity = user.engagement?.lastActivityAt
    if (lastActivity && lastActivity > cutoff) continue

    const lastDigest = user.engagement?.lastDigestSentAt
    if (lastDigest && lastDigest > digestCooldown) continue

    const pendingDrafts = await prisma.postDraft.count({
      where: { userId: user.id, sentOutreach: null },
    })
    if (pendingDrafts === 0) continue

    try {
      await sendDigestEmail(user.email, pendingDrafts)
      await prisma.userEngagement.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          lastWeekReset: getWeekKey(),
          lastDigestSentAt: new Date(),
        },
        update: { lastDigestSentAt: new Date() },
      })
      sent++
    } catch (err) {
      console.error(`[digest] Failed for user ${user.id}:`, err)
    }
  }

  return { sent, processed }
}

async function sendDigestEmail(to: string, draftCount: number) {
  const { google } = await import("googleapis")
  const subject = `You have ${draftCount} draft${draftCount !== 1 ? "s" : ""} waiting — start a conversation`
  const body = `
Hi,

You have ${draftCount} personalized draft${draftCount !== 1 ? "s" : ""} ready to send in Draft AI.

Open your drafts: ${WEB_URL}/dashboard/drafts

A few minutes on LinkedIn or X can start real conversations. Your drafts are waiting.

— Draft AI
`.trim()

  // Use Gmail API with app credentials if configured; otherwise log for dev
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.DIGEST_GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    console.log(`[digest] Would send to ${to}: ${subject}`)
    return
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const gmail = google.gmail({ version: "v1", auth: oauth2Client })
  const from = process.env.DIGEST_FROM_EMAIL || "noreply@draftai.app"

  const raw = [
    `From: Draft AI <${from}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n")

  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  })
}
