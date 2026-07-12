import { test, expect } from "@playwright/test"
import {
  PLAN_LIMITS,
  evaluateLimit,
  resolveEffectiveTier,
  type SubscriptionState,
} from "@/lib/entitlements-core"
import { allowedTonesForTier, clampTone, isToneAllowed, isToneVariantAllowed, isToneInsightAllowed } from "@/lib/tone-entitlements"
import { tierRank } from "@/lib/plans"

const DAY = 24 * 60 * 60 * 1000

function sub(overrides: Partial<SubscriptionState>): SubscriptionState {
  return {
    tier: "PRO",
    status: "ACTIVE",
    currentPeriodEnd: new Date(Date.now() + 30 * DAY),
    ...overrides,
  }
}

test.describe("entitlements: plan limits", () => {
  test("free tier caps drafts at 10 and emails at 10, no paid features", () => {
    expect(PLAN_LIMITS.FREE.drafts).toBe(10)
    expect(PLAN_LIMITS.FREE.emails).toBe(10)
    expect(PLAN_LIMITS.FREE.followUps).toBe(false)
    expect(PLAN_LIMITS.FREE.toneInsights).toBe(false)
    expect(PLAN_LIMITS.FREE.toneVariants).toBe(false)
    expect(PLAN_LIMITS.FREE.templates).toBe(0)
  })

  test("basic tier unlocks follow-ups and a template cap, but not tone insights/variants", () => {
    expect(PLAN_LIMITS.BASIC.followUps).toBe(true)
    expect(PLAN_LIMITS.BASIC.templates).toBe(5)
    expect(PLAN_LIMITS.BASIC.toneInsights).toBe(false)
    expect(PLAN_LIMITS.BASIC.toneVariants).toBe(false)
    expect(PLAN_LIMITS.BASIC.topUpDiscount).toBe(0.25)
  })

  test("pro tier unlocks everything and has unlimited templates", () => {
    expect(PLAN_LIMITS.PRO.toneInsights).toBe(true)
    expect(PLAN_LIMITS.PRO.toneVariants).toBe(true)
    expect(PLAN_LIMITS.PRO.followUps).toBe(true)
    expect(PLAN_LIMITS.PRO.templates).toBeNull()
    expect(PLAN_LIMITS.PRO.emails).toBeGreaterThan(PLAN_LIMITS.BASIC.emails)
    expect(PLAN_LIMITS.BASIC.emails).toBeGreaterThan(PLAN_LIMITS.FREE.emails)
  })

  test("tierRank orders FREE < BASIC < PRO", () => {
    expect(tierRank("FREE")).toBeLessThan(tierRank("BASIC"))
    expect(tierRank("BASIC")).toBeLessThan(tierRank("PRO"))
  })
})

test.describe("entitlements: evaluateLimit", () => {
  test("blocks the request that would exceed the cap", () => {
    expect(evaluateLimit(10, 10, 0).allowed).toBe(false)
    expect(evaluateLimit(9, 10, 0).allowed).toBe(true)
  })

  test("bonus credits raise the ceiling", () => {
    const r = evaluateLimit(10, 10, 5)
    expect(r.allowed).toBe(true)
    expect(r.limit).toBe(15)
    expect(r.remaining).toBe(5)
  })

  test("remaining never goes negative", () => {
    expect(evaluateLimit(20, 10, 0).remaining).toBe(0)
  })
})

test.describe("entitlements: resolveEffectiveTier (no trials)", () => {
  const now = new Date()

  test("no subscription → free", () => {
    expect(resolveEffectiveTier(null, now).effectiveTier).toBe("FREE")
  })

  test("active subscription keeps its tier", () => {
    expect(resolveEffectiveTier(sub({ tier: "PRO", status: "ACTIVE" }), now).effectiveTier).toBe("PRO")
    expect(resolveEffectiveTier(sub({ tier: "BASIC", status: "ACTIVE" }), now).effectiveTier).toBe("BASIC")
  })

  test("past_due keeps access during grace", () => {
    expect(resolveEffectiveTier(sub({ tier: "PRO", status: "PAST_DUE" }), now).effectiveTier).toBe("PRO")
  })

  test("canceled retains access until period end, then downgrades", () => {
    expect(
      resolveEffectiveTier(sub({ status: "CANCELED", currentPeriodEnd: new Date(now.getTime() + DAY) }), now)
        .effectiveTier
    ).toBe("PRO")
    expect(
      resolveEffectiveTier(sub({ status: "CANCELED", currentPeriodEnd: new Date(now.getTime() - DAY) }), now)
        .effectiveTier
    ).toBe("FREE")
  })

  test("incomplete → free", () => {
    expect(resolveEffectiveTier(sub({ status: "INCOMPLETE" }), now).effectiveTier).toBe("FREE")
  })
})

test.describe("tone-entitlements: Option B tone gating matrix", () => {
  test("free tier only gets professional", () => {
    expect(allowedTonesForTier("FREE")).toEqual(["professional"])
    expect(isToneAllowed("FREE", "warm")).toBe(false)
  })

  test("basic tier adds warm", () => {
    expect(allowedTonesForTier("BASIC")).toEqual(["professional", "warm"])
    expect(isToneAllowed("BASIC", "direct")).toBe(false)
  })

  test("pro tier gets all four tones", () => {
    expect(allowedTonesForTier("PRO")).toEqual(["professional", "warm", "direct", "formal"])
    expect(isToneAllowed("PRO", "formal")).toBe(true)
  })

  test("clampTone falls back to professional when the requested tone is locked", () => {
    expect(clampTone("FREE", "direct")).toBe("professional")
    expect(clampTone("BASIC", "formal")).toBe("professional")
    expect(clampTone("PRO", "formal")).toBe("formal")
  })

  test("clampTone falls back on invalid/missing input", () => {
    expect(clampTone("PRO", null)).toBe("professional")
    expect(clampTone("PRO", "not-a-real-tone")).toBe("professional")
  })

  test("tone variants and insights are Pro-only", () => {
    expect(isToneVariantAllowed("FREE")).toBe(false)
    expect(isToneVariantAllowed("BASIC")).toBe(false)
    expect(isToneVariantAllowed("PRO")).toBe(true)
    expect(isToneInsightAllowed("FREE")).toBe(false)
    expect(isToneInsightAllowed("BASIC")).toBe(false)
    expect(isToneInsightAllowed("PRO")).toBe(true)
  })
})
