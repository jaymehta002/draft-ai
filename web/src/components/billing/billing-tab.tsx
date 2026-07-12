"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { UsageMeter } from "@/components/billing/usage-meter"
import { cancelPendingCheckout, changePlan, openBillingPortal, startCheckout, startTopUp } from "@/lib/billing-client"
import { invalidateBillingStatusCache, useBillingStatus } from "@/hooks/use-billing-status"
import { useResetOnBackNavigation } from "@/hooks/use-reset-on-back-navigation"
import { PLAN_LABEL, PLAN_PRICE_USD, TOPUP_PACKS, topUpPriceFor, type TopUpPackId } from "@/lib/plans"
import { Gift, Copy, Check, Sparkles, CreditCard } from "lucide-react"

type ReferralSummary = {
  code: string
  link: string
  invitedCount: number
  rewardedCount: number
  bonusDraftsEarned: number
}

export function BillingTab() {
  const { status, loading, error: statusError, refresh } = useBillingStatus()
  const [referral, setReferral] = useState<ReferralSummary | null>(null)
  const [referralError, setReferralError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Buttons below navigate away via window.location.href — pressing the
  // browser back button can restore this component from bfcache with
  // `acting` still frozen true, leaving every button stuck disabled.
  useResetOnBackNavigation(() => setActing(false))

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const subscriptionId = params.get("subscription_id")

    const loadReferral = () =>
      fetch("/api/referral")
        .then((res) => (res.ok ? res.json() : null))
        .then((r) => {
          if (!cancelled) setReferral(r)
        })
        .catch(() => {
          if (!cancelled) setReferralError("Failed to load referral info")
        })

    const refreshAll = async () => {
      invalidateBillingStatusCache()
      await Promise.all([refresh(true), loadReferral()])
    }

    const run = async () => {
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
      } else if (params.get("checkout") === "cancelled") {
        // Release the reservation immediately instead of leaving the next
        // attempt to self-heal against Dodo's session status.
        await cancelPendingCheckout()
      }
      await refreshAll()
    }

    void run()

    const isReturning = params.get("checkout") === "success"
    let timer: ReturnType<typeof setInterval> | null = null
    if (isReturning) {
      let tries = 0
      timer = setInterval(() => {
        tries += 1
        if (cancelled) return
        void refreshAll()
        if (tries >= 6 && timer) clearInterval(timer)
      }, 5000)
    }

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [refresh])

  const runCheckout = async (tier: "BASIC" | "PRO") => {
    setActing(true)
    setError(null)
    try {
      await startCheckout({ tier })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
      setActing(false)
    }
  }

  const runChangePlan = async (tier: "BASIC" | "PRO") => {
    setActing(true)
    setError(null)
    try {
      await changePlan(tier)
      invalidateBillingStatusCache()
      await refresh(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Plan change failed")
    } finally {
      setActing(false)
    }
  }

  const runTopUp = async (packId: TopUpPackId) => {
    setActing(true)
    setError(null)
    try {
      await startTopUp(packId)
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

  const displayError = error || statusError || referralError
  if (displayError && !status) {
    return <p className="text-sm text-destructive">{displayError}</p>
  }

  const isPaid = status && status.effectiveTier !== "FREE"
  const activating =
    new URLSearchParams(window.location.search).get("checkout") === "success" && status?.effectiveTier === "FREE"

  return (
    <div className="space-y-6">
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
            <Badge variant={isPaid ? "default" : "secondary"}>{PLAN_LABEL[status?.effectiveTier ?? "FREE"]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {activating && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
              Activating your plan… this can take up to 30 seconds after payment.
            </div>
          )}

          {status?.scheduledTier && status.scheduledChangeAt && (
            <p className="text-sm text-muted-foreground">
              Switching to{" "}
              <span className="font-medium text-foreground">{PLAN_LABEL[status.scheduledTier]}</span> on{" "}
              {new Date(status.scheduledChangeAt).toLocaleDateString()}.
            </p>
          )}
          {status?.cancelAtPeriodEnd && status.currentPeriodEnd && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Cancels on {new Date(status.currentPeriodEnd).toLocaleDateString()} — you keep access until then.
            </p>
          )}
          {status?.status === "PAST_DUE" && (
            <p className="text-sm text-destructive">
              Payment failed. Update your payment method to avoid losing access.
            </p>
          )}

          {status && (
            <div className="grid gap-4 sm:grid-cols-2">
              <UsageMeter label="Drafts" used={status.usage.draftsUsed} limit={status.limits.drafts + status.usage.bonusDrafts} />
              <UsageMeter label="Emails sent" used={status.usage.emailsSent} limit={status.limits.emails + status.usage.bonusEmails} />
            </div>
          )}

          {displayError && <p className="text-sm text-destructive">{displayError}</p>}

          <div className="flex flex-wrap gap-2">
            {status?.effectiveTier === "FREE" && (
              <>
                <Button onClick={() => runCheckout("BASIC")} disabled={acting}>
                  <Sparkles className="size-4" />
                  Upgrade to Basic — ${PLAN_PRICE_USD.BASIC}/mo
                </Button>
                <Button variant="outline" onClick={() => runCheckout("PRO")} disabled={acting}>
                  Upgrade to Pro — ${PLAN_PRICE_USD.PRO}/mo
                </Button>
              </>
            )}
            {status?.effectiveTier === "BASIC" && (
              <Button onClick={() => runChangePlan("PRO")} disabled={acting}>
                <Sparkles className="size-4" />
                Upgrade to Pro — ${PLAN_PRICE_USD.PRO}/mo
              </Button>
            )}
            {status?.effectiveTier === "PRO" && !status.scheduledTier && (
              <Button variant="outline" onClick={() => runChangePlan("BASIC")} disabled={acting}>
                Switch to Basic — ${PLAN_PRICE_USD.BASIC}/mo
              </Button>
            )}
            {isPaid && (
              <Button variant="outline" onClick={runPortal} disabled={acting}>
                Manage billing
              </Button>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">
              Top up{status?.topUpDiscount ? ` (${Math.round(status.topUpDiscount * 100)}% off on Basic)` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.values(TOPUP_PACKS).map((pack) => (
                <Button key={pack.id} variant="ghost" onClick={() => runTopUp(pack.id)} disabled={acting}>
                  {pack.label} — ${topUpPriceFor(pack.id, status?.effectiveTier ?? "FREE").toFixed(2)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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

