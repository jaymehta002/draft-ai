import "server-only"
import { prisma } from "@/lib/prisma"
import { getDodo, tierForPlanId } from "@/lib/dodo"
import { invalidateEntitlements } from "@/lib/entitlements"
import type { SubscriptionStatus } from "@prisma/client"

export function mapDodoStatus(dodoStatus: string | undefined): SubscriptionStatus {
  switch ((dodoStatus || "").toLowerCase()) {
    case "active":
      return "ACTIVE"
    case "trialing":
      return "TRIALING"
    case "on_hold":
    case "past_due":
      return "PAST_DUE"
    case "cancelled":
    case "canceled":
      return "CANCELED"
    case "pending":
      return "INCOMPLETE"
    default:
      return "CANCELED"
  }
}

type UpsertSubscriptionArgs = {
  userId: string
  customerId: string
  subscriptionId: string
  productId: string
  status: string
  periodStart?: string | null
  periodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}

/** Writes subscription state from Dodo (webhook payload or API retrieve). */
export async function upsertSubscriptionForUser(args: UpsertSubscriptionArgs) {
  const now = new Date()
  const periodStart = args.periodStart ? new Date(args.periodStart) : now
  const periodEnd = args.periodEnd
    ? new Date(args.periodEnd)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const status = mapDodoStatus(args.status)
  const tier = tierForPlanId(args.productId)

  await prisma.subscription.upsert({
    where: { userId: args.userId },
    create: {
      userId: args.userId,
      dodoCustomerId: args.customerId,
      dodoSubscriptionId: args.subscriptionId,
      dodoPlanId: args.productId,
      tier,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
    },
    update: {
      dodoCustomerId: args.customerId,
      dodoSubscriptionId: args.subscriptionId,
      dodoPlanId: args.productId,
      tier,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
      trialEndsAt: status === "TRIALING" ? undefined : null,
    },
  })
  invalidateEntitlements(args.userId)
}

/**
 * Fetches a subscription from Dodo and syncs it for the signed-in user.
 * Fallback when webhooks fail or arrive after the checkout redirect.
 */
export async function syncSubscriptionForUser(userId: string, dodoSubscriptionId: string) {
  const dodo = getDodo()
  const sub = await dodo.subscriptions.retrieve(dodoSubscriptionId)

  await upsertSubscriptionForUser({
    userId,
    customerId: sub.customer.customer_id,
    subscriptionId: sub.subscription_id,
    productId: sub.product_id,
    status: sub.status,
    periodStart: sub.previous_billing_date ?? sub.created_at,
    periodEnd: sub.next_billing_date,
    cancelAtPeriodEnd: sub.cancel_at_next_billing_date,
  })

  return sub
}
