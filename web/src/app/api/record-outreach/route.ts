import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
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
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 })
    }

    const { postId, postUrl, platform, draftId, recipientName, recipientHandle, recipientProfileUrl, message, actionMode } = await req.json()

    if (!postId || !message) {
      return NextResponse.json({ error: "Missing postId or message" }, { status: 400 })
    }

    const sent = await prisma.sentOutreach.create({
      data: {
        userId: apiKey.userId,
        postDraftId: draftId || null,
        postId,
        postUrl: postUrl || null,
        platform: platform || "UNKNOWN",
        recipientName: recipientName || null,
        recipientHandle: recipientHandle || null,
        recipientProfileUrl: recipientProfileUrl || null,
        message,
        actionMode: actionMode || "DM",
        status: "COPIED",
      },
    })

    return NextResponse.json({ success: true, sentId: sent.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Record outreach error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
