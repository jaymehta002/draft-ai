/**
 * GET /api/mail-sync/all
 *
 * Scheduled sync target — invoked every 5 minutes by cron-job.org.
 * Vercel Hobby cannot run sub-daily crons, so we use an external scheduler.
 *
 * Iterates all users who have a connected Gmail account and triggers
 * a mailbox sync for each (calls processInboundForUser directly).
 *
 * Protected by Authorization: Bearer <CRON_SECRET>.
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processInboundForUser } from "@/lib/email-sync/inbound-processor"

export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(req: Request) {
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
      const rest = { ...r.value }
      delete (rest as { userId?: string }).userId
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
