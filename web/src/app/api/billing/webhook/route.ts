import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { verifyWebhook, type DodoWebhookEvent } from "@/lib/dodo"
import { grantBonusCredits, invalidateEntitlements } from "@/lib/entitlements"
import { upsertSubscriptionForUser } from "@/lib/billing-sync"
import { TOPUP_PACKS, type TopUpPackId } from "@/lib/plans"

export const dynamic = "force-dynamic"

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

async function resolveUserId(event: DodoWebhookEvent): Promise<string | null> {
  const meta = event.data.metadata
  if (meta?.userId) return meta.userId

  const subId = event.data.subscription_id
  if (subId) {
    const bySub = await prisma.subscription.findUnique({ where: { dodoSubscriptionId: subId } })
    if (bySub) return bySub.userId
  }

  const customerId = event.data.customer?.customer_id
  if (customerId) {
    const byCustomer = await prisma.subscription.findUnique({ where: { dodoCustomerId: customerId } })
    if (byCustomer) return byCustomer.userId
  }

  const email = event.data.customer?.email
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) return user.id
  }

  return null
}

/** Applies any subscription.* event by re-syncing full state from the payload. Throws (does not swallow) on unresolved/missing data so the webhook 500s and Dodo retries — a lost subscription-state-change would otherwise go unnoticed forever. */
async function applySubscriptionEvent(event: DodoWebhookEvent) {
  const userId = await resolveUserId(event)
  if (!userId) {
    throw new Error(`Dodo webhook: could not resolve user for event ${event.type}`)
  }

  const data = event.data
  const customerId = data.customer?.customer_id
  if (!customerId || !data.subscription_id) {
    throw new Error(`Dodo webhook: subscription event ${event.type} missing customer/subscription id`)
  }

  const previousStatus = (
    await prisma.subscription.findUnique({ where: { dodoSubscriptionId: data.subscription_id } })
  )?.status

  await upsertSubscriptionForUser({
    userId,
    customerId,
    subscriptionId: data.subscription_id,
    productId: data.product_id ?? "",
    status: data.status ?? "active",
    periodStart: data.previous_billing_date,
    periodEnd: data.next_billing_date,
    cancelAtPeriodEnd: Boolean(data.cancel_at_next_billing_date),
    scheduledChange: data.scheduled_change,
  })

  await prisma.subscriptionEvent.create({
    data: {
      userId,
      type: event.type,
      dodoEventId: data.subscription_id,
      metadata: { previousStatus: previousStatus ?? null, dodoStatus: data.status ?? null },
    },
  })
}

async function applyTopUp(event: DodoWebhookEvent) {
  const userId = await resolveUserId(event)
  if (!userId) {
    throw new Error("Dodo webhook: could not resolve user for top-up payment")
  }
  const packId = event.data.metadata?.packId as TopUpPackId | undefined
  const pack = packId ? TOPUP_PACKS[packId] : undefined
  if (!pack) {
    throw new Error(`Dodo webhook: unrecognized top-up pack id "${packId}"`)
  }

  await grantBonusCredits(userId, pack.kind === "email" ? { emails: pack.credits } : { drafts: pack.credits })
  await prisma.subscriptionEvent.create({
    data: { userId, type: "topup", metadata: { packId, credits: pack.credits, kind: pack.kind } },
  })
}

/**
 * Payment-failure webhooks don't carry a product_id, so this updates status
 * directly rather than routing through applySubscriptionEvent (which needs a
 * product_id to resolve the tier and would spuriously throw here).
 */
async function applyPaymentFailed(event: DodoWebhookEvent) {
  const subId = event.data.subscription_id
  if (!subId) return // one-time-payment failure, not tied to a subscription — nothing to update

  const sub = await prisma.subscription.findUnique({ where: { dodoSubscriptionId: subId } })
  if (!sub) {
    throw new Error(`Dodo webhook: payment.failed for unknown subscription ${subId}`)
  }

  await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } })
  await prisma.subscriptionEvent.create({ data: { userId: sub.userId, type: "past_due", dodoEventId: subId } })
  invalidateEntitlements(sub.userId)
}

async function applyRefund(event: DodoWebhookEvent) {
  const userId = await resolveUserId(event)
  // Refunds are logged for manual review rather than auto-reverting credits/tier —
  // reversing entitlements automatically risks yanking access mid-use on a partial refund.
  await prisma.subscriptionEvent.create({
    data: {
      userId: userId ?? "unknown",
      type: "refunded",
      metadata: { paymentId: event.data.payment_id ?? null, raw: event.data.metadata ?? null },
    },
  })
}

async function processEvent(event: DodoWebhookEvent) {
  const type = event.type

  if (type.startsWith("subscription.")) {
    await applySubscriptionEvent(event)
    return
  }

  if (type === "payment.succeeded" && event.data.metadata?.kind === "topup") {
    await applyTopUp(event)
    return
  }

  if (type === "payment.failed") {
    await applyPaymentFailed(event)
    return
  }

  if (type === "refund.succeeded") {
    await applyRefund(event)
    return
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const h = await headers()

  let event: DodoWebhookEvent
  try {
    event = await verifyWebhook(rawBody, {
      id: h.get("webhook-id") || "",
      signature: h.get("webhook-signature") || "",
      timestamp: h.get("webhook-timestamp") || "",
    })
  } catch (error) {
    const hint =
      error instanceof Error && error.message.includes("Base64Coder")
        ? " — check DODO_WEBHOOK_SECRET is the whsec_… value from Dodo, not a custom string"
        : ""
    console.error("Dodo webhook signature verification failed:", error, hint)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const eventId = h.get("webhook-id") || `${event.type}:${event.timestamp ?? ""}`

  // Atomic idempotency: the unique id constraint is the concurrency guard, not a
  // check-then-act read. Two concurrent deliveries of the same event can't both
  // win the insert, so they can't both process (e.g. double-grant top-up credits).
  try {
    await prisma.billingEvent.create({ data: { id: eventId, type: event.type, provider: "dodo" } })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    console.error("Dodo webhook: failed to record billing event", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  try {
    await processEvent(event)
  } catch (error) {
    // Roll back the dedup marker so Dodo's retry isn't blocked by our own idempotency check.
    await prisma.billingEvent.delete({ where: { id: eventId } }).catch(() => {})
    console.error("Dodo webhook processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
