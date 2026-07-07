import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/session"
import { getReferralSummary, redeemReferral } from "@/lib/referral"

/** GET → the signed-in user's referral summary (code, link, counts). */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const summary = await getReferralSummary(user.id)
  return NextResponse.json(summary)
}

/** POST { code } → redeem a referral code for the signed-in user (on signup). */
export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { code } = await req.json().catch(() => ({ code: null }))
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Missing code" }, { status: 400 })
  }

  const redeemed = await redeemReferral(code, user.id)
  return NextResponse.json({ redeemed })
}
