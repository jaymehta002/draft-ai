import "server-only"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { grantBonusCredits } from "@/lib/entitlements"

/**
 * Referral loop (from roadmap): "Give a friend 10 free drafts, get 10 when they
 * send their first message."
 *
 * Model usage:
 *  - Each referrer has one shareable "template" row (refereeId = null) holding
 *    their public code.
 *  - Each redemption creates a distinct row linking referrer → referee, rewarded
 *    (redeemedAt set) on the referee's first successful send.
 */

const BONUS_DRAFTS = 10

function makeCode(): string {
  // 8 uppercased url-safe chars.
  return randomBytes(6).toString("base64url").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()
}

/** Returns the user's shareable referral code, creating it on first access. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referral.findFirst({
    where: { referrerId: userId, refereeId: null },
  })
  if (existing) return existing.code

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode()
    try {
      const row = await prisma.referral.create({
        data: { referrerId: userId, code, bonusDrafts: BONUS_DRAFTS },
      })
      return row.code
    } catch {
      // Unique collision — retry with a new code.
    }
  }
  throw new Error("Could not generate a referral code")
}

export function referralLink(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/try?ref=${code}`
}

/**
 * Links a newly-signed-up user to their referrer. Idempotent + guards against
 * self-referral and double-redemption. Reward is deferred to first send.
 */
export async function redeemReferral(code: string, refereeUserId: string): Promise<boolean> {
  const template = await prisma.referral.findFirst({
    where: { code: code.trim().toUpperCase(), refereeId: null },
  })
  if (!template) return false
  if (template.referrerId === refereeUserId) return false

  // A user can only be referred once.
  const alreadyReferred = await prisma.referral.findUnique({
    where: { refereeId: refereeUserId },
  })
  if (alreadyReferred) return false

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.referral.create({
        data: {
          referrerId: template.referrerId,
          refereeId: refereeUserId,
          code: makeCode(),
          bonusDrafts: BONUS_DRAFTS,
        },
      })
      return true
    } catch {
      // Code collision on the redemption row — retry.
    }
  }
  return false
}

/**
 * On a referee's first successful send, credit both the referrer and the
 * referee with bonus drafts. No-op if the user wasn't referred or was already
 * rewarded.
 */
export async function maybeRewardReferralOnFirstSend(userId: string): Promise<void> {
  const redemption = await prisma.referral.findUnique({ where: { refereeId: userId } })
  if (!redemption || redemption.redeemedAt) return

  const claimed = await prisma.referral.updateMany({
    where: { id: redemption.id, redeemedAt: null },
    data: { redeemedAt: new Date() },
  })
  if (claimed.count === 0) return // lost the race, someone else rewarded it

  await grantBonusCredits(redemption.referrerId, { drafts: redemption.bonusDrafts })
  await grantBonusCredits(userId, { drafts: redemption.bonusDrafts })
}

export type ReferralSummary = {
  code: string
  link: string
  invitedCount: number
  rewardedCount: number
  bonusDraftsEarned: number
}

export async function getReferralSummary(userId: string): Promise<ReferralSummary> {
  const code = await getOrCreateReferralCode(userId)
  const redemptions = await prisma.referral.findMany({
    where: { referrerId: userId, refereeId: { not: null } },
  })
  const rewarded = redemptions.filter((r) => r.redeemedAt)
  return {
    code,
    link: referralLink(code),
    invitedCount: redemptions.length,
    rewardedCount: rewarded.length,
    bonusDraftsEarned: rewarded.reduce((sum, r) => sum + r.bonusDrafts, 0),
  }
}
