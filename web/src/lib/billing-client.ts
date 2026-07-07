import type { PlanTier, SubscriptionStatus } from "@prisma/client"

/** Client-side helpers for the billing API. Safe to import in browser code. */

export const UPGRADE_URL = "/dashboard/profile?tab=billing"

export type BillingStatus = {
  tier: PlanTier
  effectiveTier: PlanTier
  status: SubscriptionStatus
  isTrialing: boolean
  trialEndsAt: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  enforcementEnabled: boolean
  limits: { drafts: number; emails: number }
  usage: { draftsUsed: number; emailsSent: number; bonusDrafts: number; bonusEmails: number }
  remaining: { drafts: number; emails: number }
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const res = await fetch("/api/billing/status", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load billing status")
  return res.json()
}

/** Starts a checkout session and redirects the browser to Dodo's hosted page. */
export async function startCheckout(
  body: { tier: "PRO" | "POWER" } | { product: "email_pack" }
): Promise<void> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout")
  window.location.href = data.url
}

/** Opens the Dodo customer portal to manage/cancel a subscription. */
export async function openBillingPortal(): Promise<void> {
  const res = await fetch("/api/billing/portal", { method: "POST" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || "Could not open billing portal")
  window.location.href = data.url
}
