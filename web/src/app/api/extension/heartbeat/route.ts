import { NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api-key"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const apiKey = await validateApiKey(token)

    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 })
    }

    const now = new Date()
    await prisma.user.update({
      where: { id: apiKey.userId },
      data: { extensionLastSeenAt: now },
    })

    return NextResponse.json({ ok: true, lastSeenAt: now.toISOString() })
  } catch (error) {
    console.error("Extension heartbeat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
