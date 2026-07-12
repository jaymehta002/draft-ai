import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { authenticateBearerRequest } from "@/lib/bearer-auth"
import { getUserEntitlements, isEnforcementEnabled } from "@/lib/entitlements"

/**
 * Returns the current plan + usage. Used by the dashboard billing tab and the
 * extension (plan badge / usage ring). Accepts session or Bearer auth.
 */
export async function GET(req: Request) {
  let userId: string | null = null

  const user = await getSessionUser()
  if (user) {
    userId = user.id
  } else if (req.headers.get("authorization")?.startsWith("Bearer ")) {
    const auth = await authenticateBearerRequest(req)
    if (!auth.error && auth.apiKey) userId = auth.apiKey.userId
  }

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ent = await getUserEntitlements(userId, { fresh: true })

  return NextResponse.json({
    tier: ent.tier,
    effectiveTier: ent.effectiveTier,
    status: ent.status,
    cancelAtPeriodEnd: ent.cancelAtPeriodEnd,
    currentPeriodEnd: ent.currentPeriodEnd,
    scheduledTier: ent.scheduledTier,
    scheduledChangeAt: ent.scheduledChangeAt,
    enforcementEnabled: isEnforcementEnabled(),
    limits: { drafts: ent.limits.drafts, emails: ent.limits.emails },
    allowedTones: ent.limits.allowedTones,
    toneVariants: ent.limits.toneVariants,
    toneInsights: ent.limits.toneInsights,
    topUpDiscount: ent.limits.topUpDiscount,
    usage: {
      draftsUsed: ent.usage.draftsUsed,
      emailsSent: ent.usage.emailsSent,
      bonusDrafts: ent.usage.bonusDrafts,
      bonusEmails: ent.usage.bonusEmails,
    },
    remaining: ent.remaining,
  })
}
