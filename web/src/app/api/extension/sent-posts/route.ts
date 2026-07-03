import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: token },
    })

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

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
