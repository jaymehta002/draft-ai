import "server-only"
import { prisma } from "@/lib/prisma"

/** Monthly price per paid tier, in USD. Keep in sync with the pricing page. */
const TIER_PRICE: Record<string, number> = { PRO: 20, POWER: 50 }

/** Parses the ADMIN_EMAILS allowlist. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

export type AdminMetrics = {
  mrr: number
  activePro: number
  activePower: number
  trialing: number
  pastDue: number
  canceledThisMonth: number
  totalUsers: number
  activatedUsers: number
  trialToPaidRate: number
  usageThisPeriod: { drafts: number; emails: number }
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const [
    activePro,
    activePower,
    trialing,
    pastDue,
    canceledThisMonth,
    totalUsers,
    activatedUsers,
    everTrialed,
    paidNow,
    usage,
  ] = await Promise.all([
    prisma.subscription.count({ where: { tier: "PRO", status: "ACTIVE" } }),
    prisma.subscription.count({ where: { tier: "POWER", status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "TRIALING" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({
      where: { status: "CANCELED", updatedAt: { gte: startOfMonth } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { sentOutreach: { some: {} } } }),
    prisma.subscription.count({ where: { trialEndsAt: { not: null } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.usageLedger.aggregate({
      where: { periodEnd: { gte: now } },
      _sum: { draftsUsed: true, emailsSent: true },
    }),
  ])

  const mrr = activePro * TIER_PRICE.PRO + activePower * TIER_PRICE.POWER
  const trialToPaidRate = everTrialed > 0 ? Math.round((paidNow / everTrialed) * 100) : 0

  return {
    mrr,
    activePro,
    activePower,
    trialing,
    pastDue,
    canceledThisMonth,
    totalUsers,
    activatedUsers,
    trialToPaidRate,
    usageThisPeriod: {
      drafts: usage._sum.draftsUsed ?? 0,
      emails: usage._sum.emailsSent ?? 0,
    },
  }
}
