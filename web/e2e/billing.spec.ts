import { test, expect } from "@playwright/test"
import {
  PLAN_LIMITS,
  evaluateLimit,
  resolveEffectiveTier,
  type SubscriptionState,
} from "@/lib/entitlements-core"

const DAY = 24 * 60 * 60 * 1000

function sub(overrides: Partial<SubscriptionState>): SubscriptionState {
  return {
    tier: "PRO",
    status: "ACTIVE",
    trialEndsAt: null,
    currentPeriodEnd: new Date(Date.now() + 30 * DAY),
    ...overrides,
  }
}

test.describe("entitlements: plan limits", () => {
  test("free tier caps drafts at 15 and emails at 10", () => {
    expect(PLAN_LIMITS.FREE.drafts).toBe(15)
    expect(PLAN_LIMITS.FREE.emails).toBe(10)
    expect(PLAN_LIMITS.FREE.insights).toBe(false)
    expect(PLAN_LIMITS.FREE.followUps).toBe(false)
  })

  test("paid tiers unlock insights and follow-ups", () => {
    expect(PLAN_LIMITS.PRO.insights).toBe(true)
    expect(PLAN_LIMITS.PRO.followUps).toBe(true)
    expect(PLAN_LIMITS.POWER.emails).toBeGreaterThan(PLAN_LIMITS.PRO.emails)
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

test.describe("entitlements: resolveEffectiveTier", () => {
  const now = new Date()

  test("no subscription → free", () => {
    expect(resolveEffectiveTier(null, now).effectiveTier).toBe("FREE")
  })

  test("active trial grants Pro limits", () => {
    const r = resolveEffectiveTier(
      sub({ status: "TRIALING", trialEndsAt: new Date(now.getTime() + 5 * DAY) }),
      now
    )
    expect(r.effectiveTier).toBe("PRO")
    expect(r.isTrialing).toBe(true)
  })

  test("expired trial drops to free", () => {
    const r = resolveEffectiveTier(
      sub({ status: "TRIALING", trialEndsAt: new Date(now.getTime() - DAY) }),
      now
    )
    expect(r.effectiveTier).toBe("FREE")
    expect(r.isTrialing).toBe(false)
  })

  test("active subscription keeps its tier", () => {
    expect(resolveEffectiveTier(sub({ tier: "POWER", status: "ACTIVE" }), now).effectiveTier).toBe(
      "POWER"
    )
  })

  test("past_due keeps access during grace", () => {
    expect(resolveEffectiveTier(sub({ tier: "PRO", status: "PAST_DUE" }), now).effectiveTier).toBe(
      "PRO"
    )
  })

  test("canceled retains access until period end, then downgrades", () => {
    expect(
      resolveEffectiveTier(
        sub({ status: "CANCELED", currentPeriodEnd: new Date(now.getTime() + DAY) }),
        now
      ).effectiveTier
    ).toBe("PRO")
    expect(
      resolveEffectiveTier(
        sub({ status: "CANCELED", currentPeriodEnd: new Date(now.getTime() - DAY) }),
        now
      ).effectiveTier
    ).toBe("FREE")
  })

  test("incomplete → free", () => {
    expect(resolveEffectiveTier(sub({ status: "INCOMPLETE" }), now).effectiveTier).toBe("FREE")
  })
})
