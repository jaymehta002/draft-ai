import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"

/** POST { npsScore?, comment?, context? } → records an NPS / feedback entry. */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const npsScore =
    typeof body.npsScore === "number" && body.npsScore >= 0 && body.npsScore <= 10
      ? Math.round(body.npsScore)
      : null
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 2000) : null
  const context = typeof body.context === "string" ? body.context.slice(0, 100) : null

  if (npsScore === null && !comment) {
    return NextResponse.json({ error: "Provide a score or comment" }, { status: 400 })
  }

  await prisma.feedback.create({
    data: { userId: user.id, npsScore, comment, context },
  })

  return NextResponse.json({ ok: true })
}
