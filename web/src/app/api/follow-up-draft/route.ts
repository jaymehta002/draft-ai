import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { generateFollowUpDraft } from "@/lib/follow-up-draft"
import {
  checkEntitlement,
  getUserEntitlements,
  incrementUsage,
  isEnforcementEnabled,
  limitReachedResponse,
  UPGRADE_URL,
} from "@/lib/entitlements"

async function resolveUserId(req: Request): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (user) return user.id
  }

  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const auth = await authenticateBearerRequest(req, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!auth.error && auth.apiKey) return auth.apiKey.userId
  }

  return null
}

export async function POST(req: Request) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { sentOutreachId, followUpType } = body

    if (!sentOutreachId || !followUpType) {
      return NextResponse.json({ error: "Missing sentOutreachId or followUpType" }, { status: 400 })
    }

    if (followUpType !== "bump" && followUpType !== "close") {
      return NextResponse.json({ error: "Invalid followUpType" }, { status: 400 })
    }

    // Follow-ups are a Pro feature and count against the draft cap.
    const ent = await getUserEntitlements(userId)
    if (isEnforcementEnabled() && !ent.limits.followUps) {
      return NextResponse.json(
        { error: "feature_locked", feature: "follow_up", tier: ent.effectiveTier, upgradeUrl: UPGRADE_URL },
        { status: 402 }
      )
    }
    const draftCheck = await checkEntitlement(userId, "draft")
    if (!draftCheck.allowed) return limitReachedResponse(draftCheck)

    const result = await generateFollowUpDraft(userId, sentOutreachId, followUpType)
    await incrementUsage(userId, "draft")

    return NextResponse.json({ success: true, ...result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Follow-up draft error:", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
