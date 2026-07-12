"use client"

import { useState } from "react"
import { Check, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { changePlan, startCheckout, CheckoutError } from "@/lib/billing-client"
import { useResetOnBackNavigation } from "@/hooks/use-reset-on-back-navigation"
import { PLAN_PRICE_USD, PLAN_FEATURES } from "@/lib/plans"

type UpgradeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the user just hit — used to tailor the headline. */
  feature?: "draft" | "email" | "follow_up" | "tone" | "tone_variant" | "tone_insight"
  title?: string
  description?: string
}

const FEATURE_COPY: Record<NonNullable<UpgradeModalProps["feature"]>, string> = {
  draft: "You've used all your drafts this month.",
  email: "You've hit your monthly email limit.",
  follow_up: "Follow-ups require Basic or Pro.",
  tone: "This tone isn't available on your plan.",
  tone_variant: "Tone variants are a Pro feature.",
  tone_insight: "Tone performance insights are a Pro feature.",
}

export function UpgradeModal({ open, onOpenChange, feature, title, description }: UpgradeModalProps) {
  const [loading, setLoading] = useState<"BASIC" | "PRO" | null>(null)
  const [error, setError] = useState<string | null>(null)
  useResetOnBackNavigation(() => setLoading(null))

  const handleUpgrade = async (tier: "BASIC" | "PRO") => {
    setLoading(tier)
    setError(null)
    try {
      await startCheckout({ tier })
    } catch (e) {
      // Existing subscribers switching tiers must go through change-plan, not a new checkout.
      if (e instanceof CheckoutError && e.code === "use_change_plan") {
        try {
          await changePlan(tier)
          onOpenChange(false)
          return
        } catch (changeError) {
          setError(changeError instanceof Error ? changeError.message : "Could not change plan")
          setLoading(null)
          return
        }
      }
      setError(e instanceof Error ? e.message : "Could not start checkout")
      setLoading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </div>
          <DialogTitle>{title ?? "Upgrade to keep the momentum"}</DialogTitle>
          <DialogDescription>
            {description ?? (feature ? FEATURE_COPY[feature] : "Unlock higher limits and Pro features.")}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2 py-2 text-sm text-muted-foreground">
          {PLAN_FEATURES.PRO.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleUpgrade("BASIC")}
            disabled={loading !== null}
          >
            {loading === "BASIC" ? "Redirecting…" : `Upgrade to Basic — $${PLAN_PRICE_USD.BASIC}/mo`}
          </Button>
          <Button className="flex-1" onClick={() => handleUpgrade("PRO")} disabled={loading !== null}>
            {loading === "PRO" ? "Redirecting…" : `Upgrade to Pro — $${PLAN_PRICE_USD.PRO}/mo`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
