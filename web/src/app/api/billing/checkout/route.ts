import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { createSubscriptionCheckout, createTopUpCheckout, formatDodoError } from "@/lib/dodo"

/**
 * Session-authenticated. Body: { tier: "PRO" | "POWER" } for a subscription,
 * or { product: "email_pack" } for the one-time top-up. Returns a checkout URL.
 */
export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const existing = await prisma.subscription.findUnique({ where: { userId: user.id } })
    // Only reuse a real Dodo customer, not the trial placeholder.
    const customerId = existing?.dodoCustomerId?.startsWith("trial_")
      ? null
      : existing?.dodoCustomerId ?? null

    if (body.product === "email_pack") {
      const url = await createTopUpCheckout({
        userId: user.id,
        email: user.email,
        name: user.name,
        customerId,
      })
      return NextResponse.json({ url })
    }

    const tier = body.tier
    if (tier !== "PRO" && tier !== "POWER") {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }

    const url = await createSubscriptionCheckout({
      userId: user.id,
      email: user.email,
      name: user.name,
      customerId,
      tier,
    })
    return NextResponse.json({ url })
  } catch (error) {
    const message = formatDodoError(error)
    console.error("Billing checkout error:", error)
    const status =
      error && typeof error === "object" && "status" in error && (error as { status?: number }).status === 401
        ? 502
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
