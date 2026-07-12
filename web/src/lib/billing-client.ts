import type { PlanTier, SubscriptionStatus } from "@prisma/client"
import type { TopUpPackId } from "@/lib/plans"

/** Client-side helpers for the billing API. Safe to import in browser code. */

export const UPGRADE_URL = "/dashboard/profile?tab=billing"

export type BillingStatus = {
  tier: PlanTier
  effectiveTier: PlanTier
  status: SubscriptionStatus
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  scheduledTier: PlanTier | null
  scheduledChangeAt: string | null
  enforcementEnabled: boolean
  limits: { drafts: number; emails: number }
  allowedTones: string[]
  toneVariants: boolean
  toneInsights: boolean
  topUpDiscount: number
  usage: { draftsUsed: number; emailsSent: number; bonusDrafts: number; bonusEmails: number }
  remaining: { drafts: number; emails: number }
}

const PLAN_TIERS = new Set<PlanTier>(["FREE", "BASIC", "PRO"])
const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>(["ACTIVE", "PAST_DUE", "CANCELED", "INCOMPLETE"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function parseBillingStatus(raw: unknown): BillingStatus {
  if (!isRecord(raw)) throw new Error("Invalid billing status response")

  const tier = raw.tier
  const effectiveTier = raw.effectiveTier
  const status = raw.status
  const limits = raw.limits
  const usage = raw.usage
  const remaining = raw.remaining

  if (!PLAN_TIERS.has(tier as PlanTier) || !PLAN_TIERS.has(effectiveTier as PlanTier)) {
    throw new Error("Invalid billing status response")
  }
  if (!SUBSCRIPTION_STATUSES.has(status as SubscriptionStatus)) {
    throw new Error("Invalid billing status response")
  }
  if (
    !isRecord(limits) ||
    typeof limits.drafts !== "number" ||
    typeof limits.emails !== "number" ||
    !isRecord(usage) ||
    typeof usage.draftsUsed !== "number" ||
    typeof usage.emailsSent !== "number" ||
    typeof usage.bonusDrafts !== "number" ||
    typeof usage.bonusEmails !== "number" ||
    !isRecord(remaining) ||
    typeof remaining.drafts !== "number" ||
    typeof remaining.emails !== "number"
  ) {
    throw new Error("Invalid billing status response")
  }

  return {
    tier: tier as PlanTier,
    effectiveTier: effectiveTier as PlanTier,
    status: status as SubscriptionStatus,
    cancelAtPeriodEnd: Boolean(raw.cancelAtPeriodEnd),
    currentPeriodEnd: typeof raw.currentPeriodEnd === "string" ? raw.currentPeriodEnd : null,
    scheduledTier: PLAN_TIERS.has(raw.scheduledTier as PlanTier) ? (raw.scheduledTier as PlanTier) : null,
    scheduledChangeAt: typeof raw.scheduledChangeAt === "string" ? raw.scheduledChangeAt : null,
    enforcementEnabled: Boolean(raw.enforcementEnabled),
    limits: { drafts: limits.drafts, emails: limits.emails },
    allowedTones: Array.isArray(raw.allowedTones) ? (raw.allowedTones as string[]) : [],
    toneVariants: Boolean(raw.toneVariants),
    toneInsights: Boolean(raw.toneInsights),
    topUpDiscount: typeof raw.topUpDiscount === "number" ? raw.topUpDiscount : 0,
    usage: {
      draftsUsed: usage.draftsUsed,
      emailsSent: usage.emailsSent,
      bonusDrafts: usage.bonusDrafts,
      bonusEmails: usage.bonusEmails,
    },
    remaining: { drafts: remaining.drafts, emails: remaining.emails },
  }
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const res = await fetch("/api/billing/status", { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load billing status")
  const json: unknown = await res.json()
  return parseBillingStatus(json)
}

export class CheckoutError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.code = code
  }
}

/** Starts a checkout session and redirects the browser to Dodo's hosted page. */
export async function startCheckout(body: { tier: "BASIC" | "PRO" } | { pack: TopUpPackId }): Promise<void> {
  const res = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new CheckoutError(data.error || "Could not start checkout", data.code)
  window.location.href = data.url
}

/** Releases a pending checkout reservation — call when the user returns via cancel_url (closed/backed out of Dodo's checkout). */
export async function cancelPendingCheckout(): Promise<void> {
  await fetch("/api/billing/checkout", { method: "DELETE" }).catch(() => {})
}

/** Switches an existing subscription's tier via change-plan (no new checkout). */
export async function changePlan(tier: "BASIC" | "PRO"): Promise<{ effective: "immediately" | "next_billing_date" }> {
  const res = await fetch("/api/billing/change-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tier }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Could not change plan")
  return { effective: data.effective }
}

/** Starts a checkout session for a top-up pack. */
export async function startTopUp(packId: TopUpPackId): Promise<void> {
  return startCheckout({ pack: packId })
}

/** Opens the Dodo customer portal to manage/cancel a subscription. */
export async function openBillingPortal(): Promise<void> {
  const res = await fetch("/api/billing/portal", { method: "POST" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || "Could not open billing portal")
  window.location.href = data.url
}
