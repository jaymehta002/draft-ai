import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { syncSubscriptionForUser } from "@/lib/billing-sync"
import { formatDodoError } from "@/lib/dodo"

/**
 * Syncs subscription state from Dodo after checkout redirect.
 * Use when webhooks are misconfigured or arrive late.
 * Body: { subscriptionId: "sub_..." }
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const subscriptionId =
      typeof body.subscriptionId === "string" ? body.subscriptionId.trim() : ""
    if (!subscriptionId.startsWith("sub_")) {
      return NextResponse.json({ error: "Invalid subscriptionId" }, { status: 400 })
    }

    const sub = await syncSubscriptionForUser(user.id, subscriptionId)
    return NextResponse.json({
      ok: true,
      tier: sub.product_id,
      status: sub.status,
    })
  } catch (error) {
    const message = formatDodoError(error)
    console.error("Billing sync error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
