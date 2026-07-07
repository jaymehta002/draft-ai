"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchBillingStatus, UPGRADE_URL, type BillingStatus } from "@/lib/billing-client"

function pct(used: number, limit: number) {
  return limit > 0 ? (used / limit) * 100 : 0
}

/** Slim banner nudging the user to upgrade as they approach/hit their caps. */
export function UsageBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchBillingStatus()
      .then(setStatus)
      .catch(() => {})
  }, [])

  if (!status || dismissed || !status.enforcementEnabled) return null
  if (status.effectiveTier === "POWER") return null

  const draftPct = pct(status.usage.draftsUsed, status.limits.drafts + status.usage.bonusDrafts)
  const emailPct = pct(status.usage.emailsSent, status.limits.emails + status.usage.bonusEmails)
  const worst = Math.max(draftPct, emailPct)
  if (worst < 80) return null

  const atLimit = worst >= 100
  const feature = draftPct >= emailPct ? "drafts" : "emails"

  return (
    <div
      className={`flex items-center gap-3 border-b px-4 py-2.5 text-sm sm:px-6 lg:px-8 ${
        atLimit
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400"
      }`}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <p className="flex-1">
        {atLimit
          ? `You've reached your ${feature} limit for this period.`
          : `You've used ${Math.round(worst)}% of your ${feature} this period.`}{" "}
        <Link href={UPGRADE_URL} className="font-semibold underline underline-offset-2">
          Upgrade for more
        </Link>
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
