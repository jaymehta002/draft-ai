import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ensureUserApiKey } from "@/lib/api-key"
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
        { error: "Complete your profile onboarding before connecting the extension" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const state = body.state as string

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(state)) {
      return NextResponse.json({ error: "Invalid connection state" }, { status: 400 })
    }

    const apiKey = await ensureUserApiKey(session.user.id)

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
