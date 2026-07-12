"use client"

import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBillingStatus } from "@/hooks/use-billing-status"

const TONE_OPTIONS = [
  {
    value: "professional",
    label: "Professional",
    example: "I'd love to learn more about your team's approach.",
  },
  {
    value: "warm",
    label: "Warm",
    example: "Congrats on the launch — would love to swap notes!",
  },
  {
    value: "direct",
    label: "Direct",
    example: "I'm a senior engineer with distributed systems experience — interested.",
  },
  {
    value: "formal",
    label: "Formal",
    example: "I am writing to express my interest in the opportunity you described.",
  },
] as const

export function ToneStep({
  value,
  onChange,
}: {
  value: string
  onChange: (tone: string) => void
}) {
  const { status } = useBillingStatus()
  // Default to Free's allowance while status is still loading so options don't
  // flash unlocked-then-locked once the real plan resolves.
  const allowedTones = status?.allowedTones ?? ["professional"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        How should your messages sound?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Pick the voice that feels most like you. You can change this anytime in settings.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {TONE_OPTIONS.map((option) => {
          const locked = !allowedTones.includes(option.value)
          return (
            <button
              key={option.value}
              type="button"
              disabled={locked}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-[border-color,box-shadow] duration-200",
                locked
                  ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                  : value === option.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{option.label}</p>
                {locked && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Lock className="size-3" /> Upgrade
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground italic leading-relaxed">
                &ldquo;{option.example}&rdquo;
              </p>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
