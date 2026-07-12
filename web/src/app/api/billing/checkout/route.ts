import { NextResponse } from "next/server"
import { Prisma, type PlanTier } from "@prisma/client"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { createSubscriptionCheckout, createTopUpCheckout, formatDodoError, isCheckoutSessionAbandoned } from "@/lib/dodo"
import { TOPUP_PACKS, type TopUpPackId } from "@/lib/plans"

const CHECKOUT_INTENT_TTL_MS = 10 * 60 * 1000
// Grace window for a reservation that never got a Dodo session id attached —
// covers a crash/timeout between reserving and calling Dodo. Comfortably
// longer than that call should ever take.
const ORPHAN_GRACE_MS = 30 * 1000

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

const CHECKOUT_IN_PROGRESS = Object.assign(new Error("A checkout is already in progress for this account."), {
  code: "checkout_in_progress",
})

async function insertIntent(userId: string, kind: "subscription" | "topup", tier: PlanTier | null, productKey: string | null) {
  return prisma.checkoutIntent.create({
    data: { userId, kind, tier, productKey, expiresAt: new Date(Date.now() + CHECKOUT_INTENT_TTL_MS) },
  })
}

/**
 * Reserves the right to start a checkout for this user. The unique constraint
 * on CheckoutIntent.userId is the concurrency guard — a second concurrent
 * request (double-click, retry) fails to insert.
 *
 * On conflict, self-heals instead of blocking for the full TTL: if the
 * existing reservation's Dodo checkout session was abandoned (tab closed,
 * back button) or failed, or the reservation never got a session attached
 * (crashed request), it's released immediately and the new request proceeds.
 * Only a *genuinely* in-flight checkout gets a 409.
 */
async function reserveCheckoutIntent(userId: string, kind: "subscription" | "topup", tier: PlanTier | null, productKey: string | null) {
  try {
    return await insertIntent(userId, kind, tier, productKey)
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
  }

  const existing = await prisma.checkoutIntent.findUnique({ where: { userId } })
  if (!existing) {
    // Existing row vanished between our failed insert and this read (it was
    // released concurrently) — one more attempt.
    return await insertIntent(userId, kind, tier, productKey).catch(() => {
      throw CHECKOUT_IN_PROGRESS
    })
  }

  const now = Date.now()
  const expiredByTtl = existing.expiresAt.getTime() < now
  const orphaned = !existing.dodoCheckoutSessionId && now - existing.createdAt.getTime() > ORPHAN_GRACE_MS
  const abandoned = existing.dodoCheckoutSessionId
    ? await isCheckoutSessionAbandoned(existing.dodoCheckoutSessionId).catch(() => false)
    : false

  if (expiredByTtl || orphaned || abandoned) {
    await prisma.checkoutIntent.deleteMany({ where: { id: existing.id } })
    return await insertIntent(userId, kind, tier, productKey).catch(() => {
      throw CHECKOUT_IN_PROGRESS
    })
  }

  throw CHECKOUT_IN_PROGRESS
}

async function releaseCheckoutIntent(userId: string) {
  await prisma.checkoutIntent.deleteMany({ where: { userId } }).catch(() => {})
}

/**
 * Session-authenticated. Body: { tier: "BASIC" | "PRO" } for a new subscription,
 * or { pack: TopUpPackId } for a one-time top-up. Returns a checkout URL.
 *
 * Guards against duplicate Dodo subscriptions: an existing ACTIVE/PAST_DUE
 * subscriber must use /api/billing/change-plan to switch tiers, never a new
 * checkout session.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
    const customerId = existing?.dodoCustomerId ?? null
    const hasActiveSub = existing && (existing.status === "ACTIVE" || existing.status === "PAST_DUE")

    if (body.pack) {
      const packId = body.pack as TopUpPackId
      if (!(packId in TOPUP_PACKS)) {
        return NextResponse.json({ error: "Invalid top-up pack" }, { status: 400 })
      }

      const intent = await reserveCheckoutIntent(user.id, "topup", null, packId)
      try {
        const { url, sessionId } = await createTopUpCheckout({
          userId: user.id,
          email: user.email,
          name: user.name,
          customerId,
          packId,
          tier: existing?.tier ?? "FREE",
        })
        await prisma.checkoutIntent.update({ where: { id: intent.id }, data: { dodoCheckoutSessionId: sessionId } })
        return NextResponse.json({ url })
      } catch (error) {
        await releaseCheckoutIntent(user.id)
        throw error
      }
    }

    const tier = body.tier
    if (tier !== "BASIC" && tier !== "PRO") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }

    if (hasActiveSub) {
      if (existing!.tier === tier) {
        return NextResponse.json({ error: "Already subscribed to this plan", code: "already_subscribed" }, { status: 409 })
      }
      return NextResponse.json(
        { error: "Use change-plan to switch tiers on an existing subscription", code: "use_change_plan" },
        { status: 400 }
      )
    }

    const intent = await reserveCheckoutIntent(user.id, "subscription", tier, null)
    try {
      const { url, sessionId } = await createSubscriptionCheckout({
        userId: user.id,
        email: user.email,
        name: user.name,
        customerId,
        tier,
      })
      await prisma.checkoutIntent.update({ where: { id: intent.id }, data: { dodoCheckoutSessionId: sessionId } })
      return NextResponse.json({ url })
    } catch (error) {
      await releaseCheckoutIntent(user.id)
      throw error
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "checkout_in_progress") {
      const message = error instanceof Error ? error.message : "Checkout already in progress"
      return NextResponse.json({ error: message, code: "checkout_in_progress" }, { status: 409 })
    }
    const message = formatDodoError(error)
    console.error("Billing checkout error:", error)
    const status =
      error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 401
        ? 502
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}

/** Session-authenticated. Releases the caller's CheckoutIntent reservation — called when the client returns via cancel_url. */
export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  await releaseCheckoutIntent(user.id)
  return NextResponse.json({ ok: true })
}
