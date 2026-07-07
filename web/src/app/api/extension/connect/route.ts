import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { createUserApiKey } from "@/lib/api-key"
import { consumeConnectToken, isValidConnectState } from "@/lib/connect-token"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!profile?.onboardingComplete) {
      return NextResponse.json(
        {
          error: "Complete your profile onboarding before connecting the extension",
          code: "onboarding_incomplete",
        },
        { status: 400 }
      )
    }

    const body = await req.json()
    const state = body.state as string

    if (!isValidConnectState(state)) {
      return NextResponse.json(
        { error: "Invalid connection state", code: "invalid_state" },
        { status: 400 }
      )
    }

    const tokenResult = await consumeConnectToken(session.user.id, state)

    if (!tokenResult.ok) {
      const status =
        tokenResult.code === "already_connected"
          ? 409
          : tokenResult.code === "expired_state"
            ? 410
            : 400
      return NextResponse.json(
        { error: "Connection state invalid", code: tokenResult.code },
        { status }
      )
    }

    const apiKey = await createUserApiKey(session.user.id)

    return NextResponse.json({
      state,
      apiKey,
      email: session.user.email,
      name: session.user.name ?? null,
    })
  } catch (error) {
    console.error("Extension connect error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
