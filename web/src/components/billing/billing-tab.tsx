"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UsageMeter } from "@/components/billing/usage-meter"
import { fetchBillingStatus, startCheckout, openBillingPortal, type BillingStatus } from "@/lib/billing-client"
import { Gift, Copy, Check, Sparkles, CreditCard } from "lucide-react"

type ReferralSummary = {
  code: string
  link: string
  invitedCount: number
  rewardedCount: number
  bonusDraftsEarned: number
}

const TIER_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", POWER: "Power" }

export function BillingTab() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [referral, setReferral] = useState<ReferralSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const subscriptionId = params.get("subscription_id")

    const refresh = () =>
      Promise.all([
        fetchBillingStatus(),
        fetch("/api/referral").then((res) => (res.ok ? res.json() : null)),
      ])
        .then(([s, r]) => {
          setStatus(s)
          setReferral(r)
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load billing"))
        .finally(() => setLoading(false))

    const run = async () => {
      // Fallback when webhooks fail: sync directly from Dodo using return_url params.
      if (params.get("checkout") === "success" && subscriptionId) {
        try {
          await fetch("/api/billing/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId }),
          })
        } catch {
          // refresh will still run below
        }
      }
      await refresh()
    }

    void run()

    const isReturning = params.get("checkout") === "success"
    if (isReturning) {
      let tries = 0
      const timer = setInterval(() => {
        tries += 1
        void refresh()
        if (tries >= 6) clearInterval(timer)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [])

  const runCheckout = async (tier: "PRO" | "POWER") => {
    setActing(true)
    setError(null)
    try {
      await startCheckout({ tier })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
      setActing(false)
    }
  }

  const runTopUp = async () => {
    setActing(true)
    setError(null)
    try {
      await startCheckout({ product: "email_pack" })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
      setActing(false)
    }
  }

  const runPortal = async () => {
    setActing(true)
    setError(null)
    try {
      await openBillingPortal()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open portal")
      setActing(false)
    }
  }

  const copyLink = async () => {
    if (!referral) return
    await navigator.clipboard.writeText(referral.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (error && !status) {
    return <p className="text-sm text-destructive">{error}</p>
  }

  const isPaid = status && status.effectiveTier !== "FREE" && !status.isTrialing
  const activating =
    new URLSearchParams(window.location.search).get("checkout") === "success" &&
    status?.effectiveTier === "FREE"

  return (
    <div className="space-y-6">
      {/* ── Current plan ── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" />
                Plan &amp; Billing
              </CardTitle>
              <CardDescription>Your current plan and usage this period.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {status?.isTrialing && <Badge variant="success">Trial</Badge>}
              <Badge variant={isPaid ? "default" : "secondary"}>
                {TIER_LABEL[status?.effectiveTier ?? "FREE"]}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {activating && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              Activating your plan… this can take up to 30 seconds after payment.
            </div>
          )}

          {status?.isTrialing && status.trialEndsAt && (
            <p className="text-sm text-muted-foreground">
              Pro trial active until{" "}
              <span className="font-medium text-foreground">
                {new Date(status.trialEndsAt).toLocaleDateString()}
              </span>
              .
            </p>
          )}
          {status?.cancelAtPeriodEnd && status.currentPeriodEnd && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Cancels on {new Date(status.currentPeriodEnd).toLocaleDateString()} — you keep access until then.
            </p>
          )}
          {status?.status === "PAST_DUE" && (
            <p className="text-sm text-destructive">
              Payment failed. Update your payment method to avoid losing Pro access.
            </p>
          )}

          {status && (
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageMeter label="Drafts" used={status.usage.draftsUsed} limit={status.limits.drafts + status.usage.bonusDrafts} />
              <UsageMeter label="Emails sent" used={status.usage.emailsSent} limit={status.limits.emails + status.usage.bonusEmails} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {!isPaid && (
              <>
                <Button onClick={() => runCheckout("PRO")} disabled={acting}>
                  <Sparkles className="size-4" />
                  Upgrade to Pro — $20/mo
                </Button>
                <Button variant="outline" onClick={() => runCheckout("POWER")} disabled={acting}>
                  Go Power — $50/mo
                </Button>
              </>
            )}
            {isPaid && status?.effectiveTier === "PRO" && (
              <Button onClick={() => runCheckout("POWER")} disabled={acting}>
                Upgrade to Power — $50/mo
              </Button>
            )}
            {isPaid && (
              <Button variant="outline" onClick={runPortal} disabled={acting}>
                Manage billing
              </Button>
            )}
            <Button variant="ghost" onClick={runTopUp} disabled={acting}>
              Buy EmailPack — $5 (+50 emails / +50 drafts)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Referral ── */}
      {referral && (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="size-4 text-primary" />
              Give 10, get 10
            </CardTitle>
            <CardDescription>
              Share your link. Your friend gets 10 free drafts, and you get 10 when they send their first message.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={referral.link} className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-lg font-semibold text-foreground">{referral.invitedCount}</p>
                <p className="text-xs text-muted-foreground">Invited</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{referral.rewardedCount}</p>
                <p className="text-xs text-muted-foreground">Activated</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{referral.bonusDraftsEarned}</p>
                <p className="text-xs text-muted-foreground">Bonus drafts earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
