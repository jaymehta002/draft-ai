import "server-only"
import DodoPayments from "dodopayments"
import { Webhook } from "standardwebhooks"
import type { PlanTier } from "@prisma/client"

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
  PRO: "DODO_PLAN_PRO_MONTHLY",
  POWER: "DODO_PLAN_POWER_MONTHLY",
}

export function planIdForTier(tier: Exclude<PlanTier, "FREE">): string {
  const id = env(PLAN_ENV[tier])
  if (!id) throw new Error(`${PLAN_ENV[tier]} is not configured`)
  return id
}

export function tierForPlanId(planId: string | null | undefined): PlanTier {
  if (!planId) return "FREE"
  if (planId === env("DODO_PLAN_PRO_MONTHLY")) return "PRO"
  if (planId === env("DODO_PLAN_POWER_MONTHLY")) return "POWER"
  return "FREE"
}

// ─── checkout ─────────────────────────────────────────────────────────────

type CheckoutArgs = {
  userId: string
  email: string
  name?: string | null
  /** Reuse an existing Dodo customer when we already have one. */
  customerId?: string | null
}

/** Creates a hosted checkout session for a subscription tier. */
export async function createSubscriptionCheckout(
  args: CheckoutArgs & { tier: Exclude<PlanTier, "FREE"> }
): Promise<string> {
  const dodo = getDodo()
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: planIdForTier(args.tier), quantity: 1 }],
    customer: args.customerId
      ? { customer_id: args.customerId }
      : { email: args.email, name: args.name || args.email },
    return_url: appUrl("/dashboard/profile?tab=billing&checkout=success"),
    metadata: { userId: args.userId, tier: args.tier },
  })
  if (!session.checkout_url) throw new Error("Dodo did not return a checkout URL")
  return session.checkout_url
}

/** Creates a hosted checkout session for the one-time EmailPack top-up. */
export async function createTopUpCheckout(args: CheckoutArgs): Promise<string> {
  const productId = env("DODO_PRODUCT_EMAIL_PACK")
  if (!productId) throw new Error("DODO_PRODUCT_EMAIL_PACK is not configured")
  const dodo = getDodo()
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: args.customerId
      ? { customer_id: args.customerId }
      : { email: args.email, name: args.name || args.email },
    return_url: appUrl("/dashboard/profile?tab=billing&topup=success"),
    metadata: { userId: args.userId, kind: "email_pack" },
  })
  if (!session.checkout_url) throw new Error("Dodo did not return a checkout URL")
  return session.checkout_url
}

/** Returns a Dodo customer portal link for managing/cancelling a subscription. */
export async function createPortalLink(customerId: string): Promise<string> {
  const dodo = getDodo()
  const portal = await dodo.customers.customerPortal.create(customerId)
  return portal.link
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
  trial_period_days?: number
  cancel_at_next_billing_date?: boolean
  customer?: { customer_id?: string; email?: string; name?: string }
  metadata?: Record<string, string>
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
