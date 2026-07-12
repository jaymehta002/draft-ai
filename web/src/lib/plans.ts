import type { PlanTier } from "@prisma/client"
import type { Tone } from "@/lib/tone-entitlements"

/**
 * Single source of truth for plan pricing, limits, and top-up products.
 * Every billing UI and enforcement path imports from here instead of
 * hardcoding tier names/prices/limits.
 */

export const PLAN_LABEL: Record<PlanTier, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Pro",
}

export const PLAN_PRICE_USD: Record<PlanTier, number> = {
  FREE: 0,
  BASIC: 19,
  PRO: 39,
}

const PLAN_RANK: Record<PlanTier, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
}

export function tierRank(tier: PlanTier): number {
  return PLAN_RANK[tier]
}

export type PlanLimits = {
  drafts: number
  emails: number
  followUps: boolean
  /** Max saved winning templates. null = unlimited. */
  templates: number | null
  /** Discount applied to top-up pack prices, e.g. 0.25 = 25% off. */
  topUpDiscount: number
  allowedTones: Tone[]
  toneVariants: boolean
  toneInsights: boolean
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    drafts: 10,
    emails: 10,
    followUps: false,
    templates: 0,
    topUpDiscount: 0,
    allowedTones: ["professional"],
    toneVariants: false,
    toneInsights: false,
  },
  BASIC: {
    drafts: 100,
    emails: 1000,
    followUps: true,
    templates: 5,
    topUpDiscount: 0.25,
    allowedTones: ["professional", "warm"],
    toneVariants: false,
    toneInsights: false,
  },
  PRO: {
    drafts: 2000,
    emails: 10000,
    followUps: true,
    templates: null,
    topUpDiscount: 0,
    allowedTones: ["professional", "warm", "direct", "formal"],
    toneVariants: true,
    toneInsights: true,
  },
}

export const UPGRADE_URL = "/dashboard/profile?tab=billing"

export type TopUpPackId = "email_200" | "email_500" | "draft_50"

export type TopUpPack = {
  id: TopUpPackId
  label: string
  kind: "email" | "draft"
  credits: number
  priceUsd: number
  discountedPriceUsd: number
  /** Env var holding the standard-price Dodo product id. */
  envKey: string
  /** Env var holding the Basic-tier discounted Dodo product id. */
  discountedEnvKey: string
}

export const TOPUP_PACKS: Record<TopUpPackId, TopUpPack> = {
  email_200: {
    id: "email_200",
    label: "+200 emails",
    kind: "email",
    credits: 200,
    priceUsd: 8,
    discountedPriceUsd: 6,
    envKey: "DODO_PRODUCT_EMAIL_PACK_200",
    discountedEnvKey: "DODO_PRODUCT_EMAIL_PACK_200_BASIC",
  },
  email_500: {
    id: "email_500",
    label: "+500 emails",
    kind: "email",
    credits: 500,
    priceUsd: 18,
    discountedPriceUsd: 13.5,
    envKey: "DODO_PRODUCT_EMAIL_PACK_500",
    discountedEnvKey: "DODO_PRODUCT_EMAIL_PACK_500_BASIC",
  },
  draft_50: {
    id: "draft_50",
    label: "+50 drafts",
    kind: "draft",
    credits: 50,
    priceUsd: 5,
    discountedPriceUsd: 3.75,
    envKey: "DODO_PRODUCT_DRAFT_PACK_50",
    discountedEnvKey: "DODO_PRODUCT_DRAFT_PACK_50_BASIC",
  },
}

export function topUpPriceFor(packId: TopUpPackId, tier: PlanTier): number {
  const pack = TOPUP_PACKS[packId]
  return tier === "BASIC" ? pack.discountedPriceUsd : pack.priceUsd
}

export type PlanFeatureBullet = string

export const PLAN_FEATURES: Record<PlanTier, PlanFeatureBullet[]> = {
  FREE: [
    "10 drafts / month",
    "10 emails / month",
    "Professional tone",
    "Chrome extension",
    "Reply tracking",
  ],
  BASIC: [
    "100 drafts / month",
    "1,000 emails / month",
    "Professional + Warm tones",
    "Follow-ups",
    "Up to 5 saved templates",
    "25% off top-up packs",
    "Email support",
  ],
  PRO: [
    "2,000 drafts / month (soft cap)",
    "10,000 emails / month (fair-use soft cap)",
    "All 4 tones + tone variants",
    "Tone performance insights",
    "Unlimited saved templates",
    "Priority support",
  ],
}
