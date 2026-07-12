import type { PlanTier } from "@prisma/client"
import { PLAN_LIMITS } from "@/lib/plans"

/**
 * Canonical tone list — the single source of truth. Every other file that
 * needs tone values (draft prompts, onboarding UI, variant generation)
 * imports Tone/VALID_TONES from here instead of redefining the list.
 */
export const VALID_TONES = ["professional", "warm", "direct", "formal"] as const
export type Tone = (typeof VALID_TONES)[number]

const DEFAULT_TONE: Tone = "professional"

export function isValidTone(value: string): value is Tone {
  return (VALID_TONES as readonly string[]).includes(value)
}

export function allowedTonesForTier(tier: PlanTier): Tone[] {
  return PLAN_LIMITS[tier].allowedTones
}

export function isToneAllowed(tier: PlanTier, tone: string): boolean {
  return isValidTone(tone) && allowedTonesForTier(tier).includes(tone)
}

/** Falls back to the always-available default tone when the requested one isn't permitted. */
export function clampTone(tier: PlanTier, requested: string | null | undefined): Tone {
  if (requested && isValidTone(requested) && allowedTonesForTier(tier).includes(requested)) return requested
  return DEFAULT_TONE
}

export function isToneVariantAllowed(tier: PlanTier): boolean {
  return PLAN_LIMITS[tier].toneVariants
}

export function isToneInsightAllowed(tier: PlanTier): boolean {
  return PLAN_LIMITS[tier].toneInsights
}
