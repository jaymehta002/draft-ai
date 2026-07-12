import type { PlanTier } from "@prisma/client"
import { PLAN_LIMITS, UPGRADE_URL, type PlanLimits } from "@/lib/plans"

/**
 * Pure entitlement logic — no DB, no server-only imports — so it can be unit
 * tested and shared. The DB-backed orchestration lives in `entitlements.ts`.
 */

export { PLAN_LIMITS, UPGRADE_URL, type PlanLimits }

/** Minimal shape of a subscription needed for tier resolution. */
export type SubscriptionState = {
  tier: PlanTier
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE"
  currentPeriodEnd: Date
}

/** Resolves which tier's limits apply given subscription state. */
export function resolveEffectiveTier(subscription: SubscriptionState | null, now: Date = new Date()): { effectiveTier: PlanTier } {
  if (!subscription) return { effectiveTier: "FREE" }

  switch (subscription.status) {
    case "ACTIVE":
    case "PAST_DUE":
      return { effectiveTier: subscription.tier }
    case "CANCELED":
      return subscription.currentPeriodEnd > now ? { effectiveTier: subscription.tier } : { effectiveTier: "FREE" }
    case "INCOMPLETE":
    default:
      return { effectiveTier: "FREE" }
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
