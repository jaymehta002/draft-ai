import "server-only"
import DodoPayments from "dodopayments"
import { Webhook } from "standardwebhooks"
import type { PlanTier } from "@prisma/client"
import { TOPUP_PACKS, type TopUpPackId } from "@/lib/plans"

/**
 * Thin wrapper around the Dodo Payments SDK. Stripe is unavailable in India, so
 * Dodo is our merchant of record for subscriptions + one-time top-ups.
 */

let client: DodoPayments | null = null

function env(name: string): string | undefined {
  const raw = process.env[name]
  if (!raw) return undefined
  return raw.trim().replace(/^['"]|['"]$/g, "")
}

function dodoApiKey(): string {
  const key = env("DODO_API_KEY") || env("DODO_PAYMENTS_API_KEY")
  if (!key) {
    throw new Error("DODO_API_KEY (or DODO_PAYMENTS_API_KEY) is not configured")
  }
  return key
}

function dodoEnvironment(): "test_mode" | "live_mode" {
  const mode = env("DODO_ENVIRONMENT") || env("DODO_PAYMENTS_ENVIRONMENT") || "test_mode"
  return mode === "live_mode" ? "live_mode" : "test_mode"
}

export function getDodo(): DodoPayments {
  if (client) return client
  client = new DodoPayments({
    bearerToken: dodoApiKey(),
    environment: dodoEnvironment(),
  })
  return client
}

/** Turns Dodo SDK errors into actionable messages for the UI. */
export function formatDodoError(error: unknown): string {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status
    if (status === 401) {
      const mode = dodoEnvironment()
      return `Dodo API rejected the key (401). Confirm DODO_API_KEY matches ${mode} in the Dodo dashboard — test and live keys are separate.`
    }
  }
  if (error instanceof Error) return error.message
  return "Payment provider error"
}

export function appUrl(path = ""): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${base.replace(/\/$/, "")}${path}`
}

// ─── product ↔ tier mapping ────────────────────────────────────────────────

const PLAN_ENV: Record<Exclude<PlanTier, "FREE">, string> = {
  BASIC: "DODO_PLAN_BASIC_MONTHLY",
  PRO: "DODO_PLAN_PRO_MONTHLY",
}

export function planIdForTier(tier: Exclude<PlanTier, "FREE">): string {
  const id = env(PLAN_ENV[tier])
  if (!id) throw new Error(`${PLAN_ENV[tier]} is not configured`)
  return id
}

/**
 * Maps a Dodo product id back to our tier enum. Throws on an unrecognized id
 * instead of defaulting to FREE — a misconfigured/renamed Dodo product must
 * fail loudly, not silently downgrade a paying customer's entitlements.
 */
export function tierForPlanId(planId: string | null | undefined): PlanTier {
  if (!planId) throw new Error("tierForPlanId: missing product id")
  if (planId === env("DODO_PLAN_BASIC_MONTHLY")) return "BASIC"
  if (planId === env("DODO_PLAN_PRO_MONTHLY")) return "PRO"
  throw new Error(`tierForPlanId: unrecognized Dodo product id "${planId}"`)
}

function topUpProductId(packId: TopUpPackId, tier: PlanTier): string {
  const pack = TOPUP_PACKS[packId]
  const envKey = tier === "BASIC" ? pack.discountedEnvKey : pack.envKey
  const id = env(envKey)
  if (!id) throw new Error(`${envKey} is not configured`)
  return id
}

// ─── checkout ─────────────────────────────────────────────────────────────

type CheckoutArgs = {
  userId: string
  email: string
  name?: string | null
  /** Reuse an existing Dodo customer when we already have one. */
  customerId?: string | null
}

export type CheckoutResult = { url: string; sessionId: string }

/** Creates a hosted checkout session for a subscription tier. */
export async function createSubscriptionCheckout(
  args: CheckoutArgs & { tier: Exclude<PlanTier, "FREE"> }
): Promise<CheckoutResult> {
  const dodo = getDodo()
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: planIdForTier(args.tier), quantity: 1 }],
    customer: args.customerId
      ? { customer_id: args.customerId }
      : { email: args.email, name: args.name || args.email },
    return_url: appUrl("/dashboard/profile?tab=billing&checkout=success"),
    cancel_url: appUrl("/dashboard/profile?tab=billing&checkout=cancelled"),
    metadata: { userId: args.userId, tier: args.tier },
  })
  if (!session.checkout_url) throw new Error("Dodo did not return a checkout URL")
  return { url: session.checkout_url, sessionId: session.session_id }
}

/** Creates a hosted checkout session for a one-time top-up pack. */
export async function createTopUpCheckout(
  args: CheckoutArgs & { packId: TopUpPackId; tier: PlanTier }
): Promise<CheckoutResult> {
  const productId = topUpProductId(args.packId, args.tier)
  const dodo = getDodo()
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: args.customerId
      ? { customer_id: args.customerId }
      : { email: args.email, name: args.name || args.email },
    return_url: appUrl("/dashboard/profile?tab=billing&topup=success"),
    cancel_url: appUrl("/dashboard/profile?tab=billing&checkout=cancelled"),
    metadata: { userId: args.userId, kind: "topup", packId: args.packId },
  })
  if (!session.checkout_url) throw new Error("Dodo did not return a checkout URL")
  return { url: session.checkout_url, sessionId: session.session_id }
}

/**
 * True if a checkout session was abandoned/failed and is safe to release —
 * i.e. no payment was ever created for it, or the payment that was created
 * didn't succeed. Used to self-heal a stale CheckoutIntent reservation
 * without waiting out its TTL when a user closes the tab mid-checkout.
 */
export async function isCheckoutSessionAbandoned(sessionId: string): Promise<boolean> {
  const dodo = getDodo()
  const status = await dodo.checkoutSessions.retrieve(sessionId)
  if (!status.payment_id) return true
  return status.payment_status === "failed" || status.payment_status === "cancelled"
}

/** Returns a Dodo customer portal link for managing/cancelling a subscription. */
export async function createPortalLink(customerId: string): Promise<string> {
  const dodo = getDodo()
  const portal = await dodo.customers.customerPortal.create(customerId)
  return portal.link
}

// ─── plan changes (upgrade/downgrade without a new subscription) ──────────

/**
 * Switches an existing subscription to a different tier via Dodo's native
 * changePlan — never a new checkoutSessions.create. Upgrades bill the
 * prorated difference immediately; downgrades are scheduled for the next
 * billing date (no charge now, matches the "no surprise charges" contract).
 * `changePlan` returns void — callers must `retrieve()` afterward for fresh state.
 */
export async function changeSubscriptionPlan(
  subscriptionId: string,
  tier: Exclude<PlanTier, "FREE">,
  opts: { immediate: boolean }
): Promise<void> {
  const dodo = getDodo()
  await dodo.subscriptions.changePlan(subscriptionId, {
    product_id: planIdForTier(tier),
    proration_billing_mode: opts.immediate ? "prorated_immediately" : "do_not_bill",
    quantity: 1,
    effective_at: opts.immediate ? "immediately" : "next_billing_date",
  })
}

// ─── webhook verification ────────────────────────────────────────────────

let webhook: Webhook | null = null

function getWebhook(): Webhook {
  if (webhook) return webhook
  const secret = env("DODO_WEBHOOK_SECRET") || env("DODO_PAYMENTS_WEBHOOK_KEY")
  if (!secret) {
    throw new Error("DODO_WEBHOOK_SECRET (or DODO_PAYMENTS_WEBHOOK_KEY) is not configured")
  }
  try {
    webhook = new Webhook(secret)
  } catch {
    throw new Error(
      "Invalid DODO_WEBHOOK_SECRET — paste the signing secret from Dodo (Developer → Webhooks). " +
        "It is base64-encoded and usually starts with whsec_. A custom label string will not work."
    )
  }
  return webhook
}

export type DodoWebhookEvent = {
  type: string
  timestamp?: string
  business_id?: string
  data: DodoSubscriptionData & DodoPaymentData & { payload_type?: string; metadata?: Record<string, string> }
}

type DodoSubscriptionData = {
  subscription_id?: string
  product_id?: string
  status?: string
  next_billing_date?: string
  previous_billing_date?: string
  cancel_at_next_billing_date?: boolean
  customer?: { customer_id?: string; email?: string; name?: string }
  metadata?: Record<string, string>
  scheduled_change?: { product_id: string; effective_at: string } | null
}

type DodoPaymentData = {
  payment_id?: string
  metadata?: Record<string, string>
}

/**
 * Verifies the Standard Webhooks signature and returns the parsed event.
 * Throws if the signature is invalid.
 */
export async function verifyWebhook(
  rawBody: string,
  headers: { id: string; signature: string; timestamp: string }
): Promise<DodoWebhookEvent> {
  await getWebhook().verify(rawBody, {
    "webhook-id": headers.id,
    "webhook-signature": headers.signature,
    "webhook-timestamp": headers.timestamp,
  })
  return JSON.parse(rawBody) as DodoWebhookEvent
}
