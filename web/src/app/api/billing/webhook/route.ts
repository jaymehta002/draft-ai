import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { verifyWebhook, type DodoWebhookEvent } from "@/lib/dodo"
import { grantBonusCredits } from "@/lib/entitlements"
import { upsertSubscriptionForUser } from "@/lib/billing-sync"

export const dynamic = "force-dynamic"

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

async function applySubscriptionEvent(event: DodoWebhookEvent) {
  const userId = await resolveUserId(event)
  if (!userId) {
    console.warn("Dodo webhook: could not resolve user for event", event.type)
    return
  }

  const data = event.data
  const customerId = data.customer?.customer_id
  if (!customerId || !data.subscription_id) {
    console.warn("Dodo webhook: subscription event missing ids", event.type)
    return
  }

  await upsertSubscriptionForUser({
    userId,
    customerId,
    subscriptionId: data.subscription_id,
    productId: data.product_id ?? "",
    status: data.status ?? "active",
    periodStart: data.previous_billing_date,
    periodEnd: data.next_billing_date,
    cancelAtPeriodEnd: Boolean(data.cancel_at_next_billing_date),
  })
}

async function processEvent(event: DodoWebhookEvent) {
  const type = event.type

  if (type.startsWith("subscription.")) {
    await applySubscriptionEvent(event)
    return
  }

  if (type === "payment.succeeded" && event.data.metadata?.kind === "email_pack") {
    const userId = await resolveUserId(event)
    if (userId) await grantBonusCredits(userId, { drafts: 50, emails: 50 })
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
  const already = await prisma.billingEvent.findUnique({ where: { id: eventId } })
  if (already) return NextResponse.json({ received: true, duplicate: true })

  try {
    await processEvent(event)
    await prisma.billingEvent.create({
      data: { id: eventId, type: event.type, provider: "dodo" },
    })
  } catch (error) {
    console.error("Dodo webhook processing error:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
