import { NextResponse } from "next/server"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const auth = await authenticateBearerRequest(req, { scope: "extension-sent-posts", limit: 120, windowMs: 60 * 60 * 1000 })
    if (auth.error) return auth.error
    const apiKey = auth.apiKey!

    const sentOutreach = await prisma.sentOutreach.findMany({
      where: { userId: apiKey.userId },
      select: {
        postId: true,
        status: true,
        sentAt: true,
      },
      orderBy: { sentAt: "desc" },
    })

    const records = sentOutreach.map((item) => ({
      postId: item.postId,
      status: item.status as "SENT" | "COPIED",
      sentAt: item.sentAt.getTime(),
    }))

    return NextResponse.json({ records })
  } catch (error) {
    console.error("Sent posts error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
