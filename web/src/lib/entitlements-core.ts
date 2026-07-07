import type { PlanTier } from "@prisma/client"

/**
 * Pure entitlement logic — no DB, no server-only imports — so it can be unit
 * tested and shared. The DB-backed orchestration lives in `entitlements.ts`.
 */

export type PlanLimits = {
  drafts: number
  emails: number
  insights: boolean
  followUps: boolean
}

const SOFT_UNLIMITED_DRAFTS = 1000
const SOFT_UNLIMITED_EMAILS_POWER = 1000

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: { drafts: 15, emails: 10, insights: false, followUps: false },
  PRO: { drafts: SOFT_UNLIMITED_DRAFTS, emails: 200, insights: true, followUps: true },
  POWER: {
    drafts: SOFT_UNLIMITED_DRAFTS * 2,
    emails: SOFT_UNLIMITED_EMAILS_POWER,
    insights: true,
    followUps: true,
  },
}

export const UPGRADE_URL = "/dashboard/profile?tab=billing"
export const TRIAL_DAYS = 14

/** Minimal shape of a subscription needed for tier resolution. */
export type SubscriptionState = {
  tier: PlanTier
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "INCOMPLETE"
  trialEndsAt: Date | null
  currentPeriodEnd: Date
}

/** Resolves which tier's limits apply given subscription state. */
export function resolveEffectiveTier(
  subscription: SubscriptionState | null,
  now: Date = new Date()
): { effectiveTier: PlanTier; isTrialing: boolean } {
  if (!subscription) return { effectiveTier: "FREE", isTrialing: false }

  switch (subscription.status) {
    case "TRIALING": {
      const trialing = !subscription.trialEndsAt || subscription.trialEndsAt > now
      return trialing
        ? { effectiveTier: "PRO", isTrialing: true }
        : { effectiveTier: "FREE", isTrialing: false }
    }
    case "ACTIVE":
    case "PAST_DUE":
      return { effectiveTier: subscription.tier, isTrialing: false }
    case "CANCELED":
      return subscription.currentPeriodEnd > now
        ? { effectiveTier: subscription.tier, isTrialing: false }
        : { effectiveTier: "FREE", isTrialing: false }
    case "INCOMPLETE":
    default:
      return { effectiveTier: "FREE", isTrialing: false }
  }
}

/** Computes remaining allowance for a metered feature (base limit + bonus). */
export function evaluateLimit(used: number, base: number, bonus: number) {
  const limit = base + bonus
  return {
    limit,
    remaining: Math.max(0, limit - used),
    allowed: used < limit,
  }
}
