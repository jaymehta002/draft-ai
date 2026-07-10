import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"
import { incrementReplyStats } from "@/lib/user-stats"

export async function POST(req: Request) {
  try {
    const auth = await authenticateBearerRequest(req, { scope: "extension-mark-replied", limit: 60, windowMs: 60 * 60 * 1000 })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey!

    const { outreachId } = await req.json()
    if (!outreachId) {
      return NextResponse.json({ error: "Missing outreachId" }, { status: 400 })
    }

    const updated = await prisma.sentOutreach.updateMany({
      where: {
        id: outreachId,
        userId: apiKey.userId,
        responseReceivedAt: null,
      },
      data: {
        responseReceivedAt: new Date(),
        responseSource: "MANUAL",
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: "Outreach not found or already marked" }, { status: 404 })
    }

    await incrementReplyStats(apiKey.userId)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Mark replied error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
