import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { createPortalLink } from "@/lib/dodo"

/** Session-authenticated. Returns a Dodo customer-portal link (manage/cancel). */
export async function POST() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const subscription = await prisma.subscription.findUnique({ where: { userId: user.id } })
    if (!subscription) {
      return NextResponse.json({ error: "No billing account yet" }, { status: 400 })
    }

    const url = await createPortalLink(subscription.dodoCustomerId)
    return NextResponse.json({ url })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal failed"
    console.error("Billing portal error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
