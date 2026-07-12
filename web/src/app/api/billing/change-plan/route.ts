import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { changeSubscriptionPlan, formatDodoError } from "@/lib/dodo"
import { syncSubscriptionForUser } from "@/lib/billing-sync"
import { tierRank } from "@/lib/plans"

/**
 * Session-authenticated. Body: { tier: "BASIC" | "PRO" }.
 * Switches an existing active subscription to a different tier via Dodo's
 * changePlan — never creates a new subscription. Upgrades apply and bill
 * immediately (prorated); downgrades are scheduled for the next billing date.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const tier = body.tier
    if (tier !== "BASIC" && tier !== "PRO") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }

    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
    if (!existing?.dodoSubscriptionId || (existing.status !== "ACTIVE" && existing.status !== "PAST_DUE")) {
      return NextResponse.json({ error: "No active subscription to change" }, { status: 400 })
    }
    if (existing.tier === tier) {
      return NextResponse.json({ error: "Already on this plan", code: "already_subscribed" }, { status: 409 })
    }

    const isUpgrade = tierRank(tier) > tierRank(existing.tier)
    const fromTier = existing.tier

    await changeSubscriptionPlan(existing.dodoSubscriptionId, tier, { immediate: isUpgrade })
    await syncSubscriptionForUser(user.id, existing.dodoSubscriptionId)

    await prisma.subscriptionEvent.create({
      data: {
        userId: user.id,
        type: "plan_changed",
        fromTier,
        toTier: tier,
        metadata: { immediate: isUpgrade },
      },
    })

    return NextResponse.json({
      ok: true,
      tier: isUpgrade ? tier : fromTier,
      scheduledTier: isUpgrade ? null : tier,
      effective: isUpgrade ? "immediately" : "next_billing_date",
    })
  } catch (error) {
    const message = formatDodoError(error)
    console.error("Billing change-plan error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
