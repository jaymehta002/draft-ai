import "server-only"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { PlanTier, SubscriptionStatus, Subscription, UsageLedger } from "@prisma/client"
import {
  PLAN_LIMITS,
  UPGRADE_URL,
  TRIAL_DAYS,
  resolveEffectiveTier as resolveEffectiveTierCore,
  evaluateLimit,
  type PlanLimits,
} from "@/lib/entitlements-core"

/**
 * Server-side entitlement engine for Phase 3 billing.
 *
 * Metering rules (see plan):
 *  - draft generated (incl. variants + follow-ups) → 1 draft
 *  - email sent                                     → 1 email
 *  - an email send never also deducts a draft
 *
 * Bonus credits (top-ups + referrals) raise the ceiling for the current period.
 */

export type Feature = "draft" | "email" | "insight"

export { PLAN_LIMITS, UPGRADE_URL, TRIAL_DAYS, type PlanLimits }

export function isEnforcementEnabled() {
  return process.env.BILLING_ENFORCEMENT_ENABLED === "true"
}

/** Resolves which tier's limits currently apply given subscription state. */
export function resolveEffectiveTier(subscription: Subscription | null): {
  effectiveTier: PlanTier
  isTrialing: boolean
} {
  return resolveEffectiveTierCore(subscription)
}

export type Entitlements = {
  tier: PlanTier
  /** The tier whose limits currently apply (trial → PRO). */
  effectiveTier: PlanTier
  status: SubscriptionStatus
  isTrialing: boolean
  trialEndsAt: Date | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
  limits: PlanLimits
  usage: {
    draftsUsed: number
    emailsSent: number
    bonusDrafts: number
    bonusEmails: number
  }
  remaining: { drafts: number; emails: number }
}

// ─── period helpers ───────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

function startOfNextMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0))
}

/**
 * Resolves the billing period the usage ledger should be keyed on. Paid/active
 * subscriptions follow their Dodo period; everyone else uses the calendar month.
 */
function resolvePeriod(subscription: Subscription | null): { start: Date; end: Date } {
  const now = new Date()
  if (
    subscription &&
    subscription.currentPeriodStart &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > now &&
    (subscription.status === "ACTIVE" ||
      subscription.status === "TRIALING" ||
      subscription.status === "PAST_DUE")
  ) {
    return { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd }
  }
  return { start: startOfMonth(now), end: startOfNextMonth(now) }
}

// ─── ledger ─────────────────────────────────────────────────────────────────

async function getOrCreateLedger(
  userId: string,
  period: { start: Date; end: Date }
): Promise<UsageLedger> {
  const existing = await prisma.usageLedger.findUnique({
    where: { userId_periodStart: { userId, periodStart: period.start } },
  })
  if (existing) return existing

  // Carry unused bonus credits forward from the most recent prior ledger so
  // top-ups/referral rewards are not wiped by a period rollover.
  const prior = await prisma.usageLedger.findFirst({
    where: { userId, periodStart: { lt: period.start } },
    orderBy: { periodStart: "desc" },
  })
  const carryDrafts = Math.max(0, (prior?.bonusDrafts ?? 0) - (prior?.draftsUsed ?? 0))
  const carryEmails = Math.max(0, (prior?.bonusEmails ?? 0) - (prior?.emailsSent ?? 0))

  try {
    return await prisma.usageLedger.create({
      data: {
        userId,
        periodStart: period.start,
        periodEnd: period.end,
        bonusDrafts: carryDrafts,
        bonusEmails: carryEmails,
      },
    })
  } catch {
    // Lost a race — another request created the row first.
    const row = await prisma.usageLedger.findUnique({
      where: { userId_periodStart: { userId, periodStart: period.start } },
    })
    if (row) return row
    throw new Error("Failed to resolve usage ledger")
  }
}

// ─── entitlements ─────────────────────────────────────────────────────────────

// Short-lived per-user cache to avoid two DB reads on every metered request.
const CACHE_TTL_MS = 30_000
const cache = new Map<string, { value: Entitlements; expiresAt: number }>()

export function invalidateEntitlements(userId: string) {
  cache.delete(userId)
}

export async function getUserEntitlements(
  userId: string,
  options?: { fresh?: boolean }
): Promise<Entitlements> {
  if (!options?.fresh) {
    const hit = cache.get(userId)
    if (hit && hit.expiresAt > Date.now()) return hit.value
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const period = resolvePeriod(subscription)
  const ledger = await getOrCreateLedger(userId, period)

  const { effectiveTier, isTrialing } = resolveEffectiveTier(subscription)
  const limits = PLAN_LIMITS[effectiveTier]

  const draftsUsed = ledger?.draftsUsed ?? 0
  const emailsSent = ledger?.emailsSent ?? 0
  const bonusDrafts = ledger?.bonusDrafts ?? 0
  const bonusEmails = ledger?.bonusEmails ?? 0

  const value: Entitlements = {
    tier: subscription?.tier ?? "FREE",
    effectiveTier,
    status: subscription?.status ?? "ACTIVE",
    isTrialing,
    trialEndsAt: subscription?.trialEndsAt ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? period.end,
    limits,
    usage: { draftsUsed, emailsSent, bonusDrafts, bonusEmails },
    remaining: {
      drafts: Math.max(0, limits.drafts + bonusDrafts - draftsUsed),
      emails: Math.max(0, limits.emails + bonusEmails - emailsSent),
    },
  }

  cache.set(userId, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

export type EntitlementCheck = {
  allowed: boolean
  reason?: "limit_reached" | "feature_locked"
  feature: Feature
  used: number
  limit: number
  remaining: number
  tier: PlanTier
  upgradeUrl: string
}

/**
 * Decides whether a user may perform a metered action *before* it runs.
 * When BILLING_ENFORCEMENT_ENABLED is off this always allows (staged rollout).
 */
export async function checkEntitlement(
  userId: string,
  feature: Feature
): Promise<EntitlementCheck> {
  const ent = await getUserEntitlements(userId)
  const base = {
    feature,
    tier: ent.effectiveTier,
    upgradeUrl: UPGRADE_URL,
  }

  if (feature === "insight") {
    const allowed = ent.limits.insights
    return {
      ...base,
      allowed: allowed || !isEnforcementEnabled(),
      reason: allowed ? undefined : "feature_locked",
      used: 0,
      limit: 0,
      remaining: 0,
    }
  }

  const isDraft = feature === "draft"
  const used = isDraft ? ent.usage.draftsUsed : ent.usage.emailsSent
  const bonus = isDraft ? ent.usage.bonusDrafts : ent.usage.bonusEmails
  const baseLimit = isDraft ? ent.limits.drafts : ent.limits.emails
  const { allowed, limit, remaining } = evaluateLimit(used, baseLimit, bonus)

  return {
    feature,
    tier: ent.effectiveTier,
    upgradeUrl: UPGRADE_URL,
    allowed: allowed || !isEnforcementEnabled(),
    reason: allowed ? undefined : "limit_reached",
    used,
    limit,
    remaining,
  }
}

function entitlementBlockedMessage(check: Pick<EntitlementCheck, "reason" | "feature">): string {
  if (check.reason === "feature_locked") {
    return "This feature requires Pro. Upgrade to continue."
  }
  if (check.feature === "email") {
    return "Monthly email limit reached. Upgrade to keep sending."
  }
  return `Monthly ${check.feature} limit reached. Upgrade to continue.`
}

/** Standard 402 response body for a blocked metered request. */
export function limitReachedResponse(check: EntitlementCheck) {
  return NextResponse.json(
    {
      success: false,
      code: check.reason ?? "limit_reached",
      feature: check.feature,
      upgradeUrl: check.upgradeUrl,
      error: entitlementBlockedMessage(check),
      used: check.used,
      limit: check.limit,
      tier: check.tier,
    },
    { status: 402 }
  )
}

// ─── mutation ──────────────────────────────────────────────────────────────

/**
 * Atomically reserves one unit of usage before external work (OpenAI/Gmail).
 * When enforcement is off, always succeeds after the entitlement check.
 */
export async function reserveUsage(
  userId: string,
  feature: Exclude<Feature, "insight">
): Promise<{ reserved: boolean; check: EntitlementCheck }> {
  const check = await checkEntitlement(userId, feature)
  if (!check.allowed) return { reserved: false, check }
  if (!isEnforcementEnabled()) return { reserved: true, check }

  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const period = resolvePeriod(subscription)
  await getOrCreateLedger(userId, period)

  await prisma.usageLedger.update({
    where: { userId_periodStart: { userId, periodStart: period.start } },
    data: feature === "draft" ? { draftsUsed: { increment: 1 } } : { emailsSent: { increment: 1 } },
  })
  invalidateEntitlements(userId)

  const fresh = await getUserEntitlements(userId, { fresh: true })
  const used = feature === "draft" ? fresh.usage.draftsUsed : fresh.usage.emailsSent
  const bonus = feature === "draft" ? fresh.usage.bonusDrafts : fresh.usage.bonusEmails
  const baseLimit = feature === "draft" ? fresh.limits.drafts : fresh.limits.emails
  const { allowed } = evaluateLimit(used, baseLimit, bonus)

  if (!allowed) {
    await prisma.usageLedger.update({
      where: { userId_periodStart: { userId, periodStart: period.start } },
      data: feature === "draft" ? { draftsUsed: { decrement: 1 } } : { emailsSent: { decrement: 1 } },
    })
    invalidateEntitlements(userId)
    const blocked = await checkEntitlement(userId, feature)
    return { reserved: false, check: blocked }
  }

  return { reserved: true, check }
}

export async function releaseUsage(userId: string, feature: Exclude<Feature, "insight">) {
  if (!isEnforcementEnabled()) return

  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const period = resolvePeriod(subscription)

  await prisma.usageLedger.updateMany({
    where: {
      userId,
      periodStart: period.start,
      ...(feature === "draft" ? { draftsUsed: { gt: 0 } } : { emailsSent: { gt: 0 } }),
    },
    data: feature === "draft" ? { draftsUsed: { decrement: 1 } } : { emailsSent: { decrement: 1 } },
  })
  invalidateEntitlements(userId)
}

export async function incrementUsage(userId: string, feature: Exclude<Feature, "insight">) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const period = resolvePeriod(subscription)
  await getOrCreateLedger(userId, period)

  await prisma.usageLedger.update({
    where: { userId_periodStart: { userId, periodStart: period.start } },
    data: feature === "draft" ? { draftsUsed: { increment: 1 } } : { emailsSent: { increment: 1 } },
  })
  invalidateEntitlements(userId)
}

/** Adds bonus credits (top-up purchase or referral reward) to the live period. */
export async function grantBonusCredits(
  userId: string,
  bonus: { drafts?: number; emails?: number }
) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } })
  const period = resolvePeriod(subscription)
  await getOrCreateLedger(userId, period)

  await prisma.usageLedger.update({
    where: { userId_periodStart: { userId, periodStart: period.start } },
    data: {
      bonusDrafts: { increment: bonus.drafts ?? 0 },
      bonusEmails: { increment: bonus.emails ?? 0 },
    },
  })
  invalidateEntitlements(userId)
}

/**
 * Starts a 14-day Pro trial on the user's first successful send. No-op if the
 * user already has any subscription record. Trial psychology: let them feel
 * the win before paywall pressure.
 */
export async function startProTrial(userId: string) {
  const existing = await prisma.subscription.findUnique({ where: { userId } })
  if (existing) return existing

  const now = new Date()
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  const sub = await prisma.subscription.create({
    data: {
      userId,
      // No Dodo customer yet — placeholder id keeps the unique constraint happy
      // until a real checkout links the account.
      dodoCustomerId: `trial_${userId}`,
      tier: "PRO",
      status: "TRIALING",
      trialEndsAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    },
  }).catch(async () => {
    const row = await prisma.subscription.findUnique({ where: { userId } })
    if (!row) throw new Error("Failed to start Pro trial")
    return row
  })
  invalidateEntitlements(userId)
  return sub
}
