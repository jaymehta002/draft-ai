"use client"

import { useState } from "react"
import Link from "next/link"
import { CreditCard, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { UsageMeter } from "@/components/billing/usage-meter"
import { startCheckout } from "@/lib/billing-client"
import { useBillingStatus } from "@/hooks/use-billing-status"

const TIER_LABEL: Record<string, string> = { FREE: "Free", PRO: "Pro", POWER: "Power" }
const EASE = "cubic-bezier(0.16,1,0.3,1)"

function pct(used: number, limit: number) {
  return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
}

/** Compact plan/usage nudge shown in the left nav — expanded and icon-rail states. */
export function PlanSidebarWidget({ collapsed }: { collapsed: boolean }) {
  const { status, loading } = useBillingStatus()
  const [acting, setActing] = useState(false)

  if (loading || !status) return null

  const tier = status.effectiveTier
  const isPaid = tier !== "FREE" && !status.isTrialing

  const draftLimit = status.limits.drafts + status.usage.bonusDrafts
  const emailLimit = status.limits.emails + status.usage.bonusEmails
  const draftPct = pct(status.usage.draftsUsed, draftLimit)
  const emailPct = pct(status.usage.emailsSent, emailLimit)
  const usePrimaryDrafts = draftPct >= emailPct
  const primaryLabel = usePrimaryDrafts ? "Drafts" : "Emails"
  const primaryUsed = usePrimaryDrafts ? status.usage.draftsUsed : status.usage.emailsSent
  const primaryLimit = usePrimaryDrafts ? draftLimit : emailLimit
  const primaryPct = Math.max(draftPct, emailPct)

  const handleUpgrade = async () => {
    setActing(true)
    try {
      await startCheckout({ tier: "PRO" })
    } catch {
      setActing(false)
    }
  }

  if (collapsed) {
    return (
      <div className="group/item relative px-2.5 pb-2">
        <Link
          href="/dashboard/profile?tab=billing"
          aria-label="Plan and usage"
          className="relative mx-auto flex size-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/40 text-sidebar-accent-foreground transition-colors duration-200 hover:bg-sidebar-accent/70"
        >
          {isPaid ? (
            <CreditCard className="size-4" strokeWidth={1.75} />
          ) : (
            <Sparkles className="size-4 text-primary" strokeWidth={1.75} />
          )}
          {!isPaid && primaryPct >= 80 && (
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-sidebar" />
          )}
        </Link>
        <div
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100"
          style={{ transitionTimingFunction: EASE }}
        >
          <div className="relative rounded-md border border-sidebar-border bg-sidebar/95 px-3 py-2 shadow-lg backdrop-blur-sm">
            <div className="absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-b border-sidebar-border bg-sidebar/95" />
            <div className="relative">
              <p className="text-xs font-medium text-sidebar-foreground">{TIER_LABEL[tier]} plan</p>
              <p className="mt-0.5 text-[10px] text-sidebar-foreground/60">
                {primaryLabel}: {primaryUsed}/{primaryLimit}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-2.5 mb-2 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/60">
          Your plan
        </span>
        <div className="flex items-center gap-1">
          {status.isTrialing && (
            <Badge variant="success" className="h-4 px-1.5 py-0 text-[9px]">
              Trial
            </Badge>
          )}
          <Badge variant={isPaid ? "default" : "secondary"} className="h-4 px-1.5 py-0 text-[9px]">
            {TIER_LABEL[tier]}
          </Badge>
        </div>
      </div>

      <UsageMeter label={primaryLabel} used={primaryUsed} limit={primaryLimit} />

      <div className="mt-3">
        {isPaid ? (
          <Link
            href="/dashboard/profile?tab=billing"
            className="block w-full rounded-lg border border-sidebar-border px-3 py-1.5 text-center text-xs font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent/70"
          >
            Manage plan
          </Link>
        ) : (
          <button
            onClick={handleUpgrade}
            disabled={acting}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-[background-color,transform] duration-200 hover:bg-primary-hover active:scale-[0.98] active:duration-75 disabled:opacity-60"
          >
            <Sparkles className="size-3.5" />
            {acting ? "Redirecting…" : "Upgrade plan"}
          </button>
        )}
      </div>
    </div>
  )
}
