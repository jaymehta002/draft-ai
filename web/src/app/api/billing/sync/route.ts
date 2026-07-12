import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { syncSubscriptionForUser } from "@/lib/billing-sync"
import { formatDodoError, getDodo } from "@/lib/dodo"

/**
 * Syncs subscription state from Dodo after checkout redirect.
 * Use when webhooks are misconfigured or arrive late.
 * Body: { subscriptionId: "sub_..." }
 *
 * Ownership-checked: a caller may only sync a Dodo subscription that is
 * actually theirs (matched via checkout metadata.userId or their existing
 * Dodo customer id) — otherwise this would let any logged-in user attach an
 * arbitrary subscription id to their own account.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId.trim() : ""
    if (!subscriptionId.startsWith("sub_")) {
      return NextResponse.json({ error: "Invalid subscriptionId" }, { status: 400 })
    }

    const dodo = getDodo()
    const sub = await dodo.subscriptions.retrieve(subscriptionId)

    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
    const ownsViaMetadata = sub.metadata?.userId === user.id
    const ownsViaCustomer = Boolean(existing?.dodoCustomerId) && sub.customer.customer_id === existing?.dodoCustomerId
    if (!ownsViaMetadata && !ownsViaCustomer) {
      return NextResponse.json({ error: "This subscription does not belong to you" }, { status: 403 })
    }

    await syncSubscriptionForUser(user.id, subscriptionId)
    return NextResponse.json({ ok: true, tier: sub.product_id, status: sub.status })
  } catch (error) {
    const message = formatDodoError(error)
    console.error("Billing sync error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
