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
import { startCheckout } from "@/lib/billing-client"

type UpgradeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the user just hit — used to tailor the headline. */
  feature?: "draft" | "email" | "follow_up" | "insight"
  title?: string
  description?: string
}

const FEATURE_COPY: Record<NonNullable<UpgradeModalProps["feature"]>, string> = {
  draft: "You've used all your free drafts this month.",
  email: "You've hit your monthly email limit.",
  follow_up: "Follow-up drafts are a Pro feature.",
  insight: "Tone insights are a Pro feature.",
}

const PRO_FEATURES = [
  "Unlimited-feel drafts",
  "200 emails / month",
  "Tone insights & follow-ups",
  "Winning templates",
]

export function UpgradeModal({ open, onOpenChange, feature, title, description }: UpgradeModalProps) {
  const [loading, setLoading] = useState<"PRO" | "POWER" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (tier: "PRO" | "POWER") => {
    setLoading(tier)
    setError(null)
    try {
      await startCheckout({ tier })
    } catch (e) {
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
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" onClick={() => handleUpgrade("PRO")} disabled={loading !== null}>
            {loading === "PRO" ? "Redirecting…" : "Upgrade to Pro — $20/mo"}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleUpgrade("POWER")}
            disabled={loading !== null}
          >
            {loading === "POWER" ? "Redirecting…" : "Go Power — $50/mo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
