import "server-only"
import { prisma } from "@/lib/prisma"
import { PLAN_PRICE_USD } from "@/lib/plans"

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
  activeBasic: number
  activePro: number
  pastDue: number
  canceledThisMonth: number
  totalUsers: number
  activatedUsers: number
  usageThisPeriod: { drafts: number; emails: number }
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const now = new Date()
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const [activeBasic, activePro, pastDue, canceledThisMonth, totalUsers, activatedUsers, usage] = await Promise.all([
    prisma.subscription.count({ where: { tier: "BASIC", status: "ACTIVE" } }),
    prisma.subscription.count({ where: { tier: "PRO", status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.subscription.count({
      where: { status: "CANCELED", updatedAt: { gte: startOfMonth } },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { sentOutreach: { some: {} } } }),
    prisma.usageLedger.aggregate({
      where: { periodEnd: { gte: now } },
      _sum: { draftsUsed: true, emailsSent: true },
    }),
  ])

  const mrr = activeBasic * PLAN_PRICE_USD.BASIC + activePro * PLAN_PRICE_USD.PRO

  return {
    mrr,
    activeBasic,
    activePro,
    pastDue,
    canceledThisMonth,
    totalUsers,
    activatedUsers,
    usageThisPeriod: {
      drafts: usage._sum.draftsUsed ?? 0,
      emails: usage._sum.emailsSent ?? 0,
    },
  }
}
