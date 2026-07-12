"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useResetOnBackNavigation } from "@/hooks/use-reset-on-back-navigation"

type PricingCtaProps = {
  tier: "BASIC" | "PRO"
  label: string
  variant?: "default" | "outline"
}

/** Starts checkout; bounces unauthenticated visitors to sign-in first. */
export function PricingCta({ tier, label, variant = "default" }: PricingCtaProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useResetOnBackNavigation(() => setLoading(false))

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      if (res.status === 401) {
        const callback = encodeURIComponent(`/pricing`)
        window.location.href = `/api/auth/signin?callbackUrl=${callback}`
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.code === "use_change_plan") {
        window.location.href = "/dashboard/profile?tab=billing"
        return
      }
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout")
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" variant={variant} onClick={handleClick} disabled={loading}>
        {loading ? "Redirecting…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
