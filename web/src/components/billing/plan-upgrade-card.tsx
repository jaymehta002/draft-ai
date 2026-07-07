"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UsageMeter } from "@/components/billing/usage-meter"
import { fetchBillingStatus, startCheckout, type BillingStatus } from "@/lib/billing-client"

const TIER_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", POWER: "Power" }

/** Overview card — current plan, usage, and one-click upgrade. */
export function PlanUpgradeCard() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBillingStatus()
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const upgrade = async (tier: "PRO" | "POWER") => {
    setActing(true)
    setError(null)
    try {
      await startCheckout({ tier })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed")
      setActing(false)
    }
  }

  if (loading) return null

  const tier = status?.effectiveTier ?? "FREE"
  const isPaid = tier !== "FREE" && !status?.isTrialing

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4" />
              Your plan
            </CardTitle>
            <CardDescription>
              {isPaid ? "Manage billing or change your plan." : "Upgrade for more drafts, emails, and Pro features."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {status?.isTrialing && <Badge variant="success">Trial</Badge>}
            <Badge variant={isPaid ? "default" : "secondary"}>{TIER_LABEL[tier]}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="grid gap-3 sm:grid-cols-2">
            <UsageMeter
              label="Drafts"
              used={status.usage.draftsUsed}
              limit={status.limits.drafts + status.usage.bonusDrafts}
            />
            <UsageMeter
              label="Emails"
              used={status.usage.emailsSent}
              limit={status.limits.emails + status.usage.bonusEmails}
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-wrap gap-2">
          {!isPaid && (
            <>
              <Button size="sm" onClick={() => upgrade("PRO")} disabled={acting}>
                <Sparkles className="size-4" />
                {acting ? "Redirecting…" : "Upgrade to Pro — $20/mo"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => upgrade("POWER")} disabled={acting}>
                Go Power — $50/mo
              </Button>
            </>
          )}
          {isPaid && tier === "PRO" && (
            <Button size="sm" onClick={() => upgrade("POWER")} disabled={acting}>
              Upgrade to Power
            </Button>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href="/dashboard/profile?tab=billing">Plan &amp; billing</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
