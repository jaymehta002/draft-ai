/**
 * POST /api/mail-sync
 *
 * Triggers a mailbox sync for the currently authenticated user (session-based)
 * or for a specific userId when called from the cron route with CRON_SECRET.
 *
 * Used by:
 *  - The "Sync now" button in the Emails panel (session auth)
 *  - The /api/mail-sync/all cron route (secret auth, passes userId)
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processInboundForUser } from "@/lib/email-sync/inbound-processor"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(req: Request) {
  // ── Auth: CRON_SECRET (server-to-server) ──────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

  let userId: string | null = null

  if (isCron) {
    // Cron callers pass userId in the JSON body
    const body = await req.json().catch(() => ({}))
    userId = typeof body.userId === "string" ? body.userId : null
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }
  } else {
    // Interactive callers must have an active session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    userId = user.id
  }

  try {
    const result = await processInboundForUser(userId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[mail-sync] Unhandled error:", err)
    return NextResponse.json({ ok: false, userId, error: message }, { status: 500 })
  }
}

/** Lightweight GET for health checks. */
export async function GET() {
  return NextResponse.json({ status: "ok" })
}
