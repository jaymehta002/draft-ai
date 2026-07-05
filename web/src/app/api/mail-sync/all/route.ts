/**
 * GET /api/mail-sync/all
 *
 * Vercel Cron target — runs every 5 minutes.
 * Iterates all users who have a connected Gmail account and triggers
 * a mailbox sync for each, using the per-user /api/mail-sync route logic
 * directly (no HTTP round-trip — calls processInboundForUser directly).
 *
 * Protected by CRON_SECRET header set in vercel.json.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processInboundForUser } from "@/lib/email-sync/inbound-processor"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(req: Request) {
  // Vercel sets the Authorization header from the cron secret automatically.
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find all users who have a Google account with a refresh token
  const usersWithGmail = await prisma.account.findMany({
    where: {
      provider: "google",
      refresh_token: { not: null },
    },
    select: { userId: true },
    distinct: ["userId"],
  })

  const userIds = usersWithGmail.map((a) => a.userId)

  const results = await Promise.allSettled(
    userIds.map((userId) => processInboundForUser(userId))
  )

  const summary = results.map((r, i) => {
    const userId = userIds[i]
    if (r.status === "fulfilled") {
      const { userId: _uid, ...rest } = r.value
      return { userId, status: r.status, ...rest }
    }
    return { userId, status: r.status, error: String(r.reason) }
  })

  const errors = summary.filter((s) => s.status === "rejected" || !("ok" in s && s.ok))
  const successes = summary.filter((s) => "ok" in s && s.ok)

  console.log(
    `[mail-sync/all] Processed ${userIds.length} users — ` +
    `${successes.length} ok, ${errors.length} errors`
  )

  return NextResponse.json({
    processed: userIds.length,
    successes: successes.length,
    errors: errors.length,
    summary,
  })
}
