import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { isValidConnectState, registerConnectToken } from "@/lib/connect-token"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const limited = rateLimit({
      key: `connect-init:${session.user.id}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
    if (!limited.success) {
      return rateLimitResponse(limited.resetAt)
    }

    const body = await req.json()
    const state = body.state as string

    if (!isValidConnectState(state)) {
      return NextResponse.json(
        { error: "Invalid connection state", code: "invalid_state" },
        { status: 400 }
      )
    }

    const result = await registerConnectToken(session.user.id, state)

    if (!result.ok) {
      const status = result.code === "already_connected" ? 409 : 400
      return NextResponse.json(
        { error: "Connection state invalid", code: result.code },
        { status }
      )
    }

    return NextResponse.json({
      state,
      expiresAt: result.token.expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("Extension connect init error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
