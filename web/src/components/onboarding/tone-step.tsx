"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

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
        {TONE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl border p-4 text-left transition-[border-color,box-shadow] duration-200",
              value === option.value
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <p className="text-sm font-semibold text-foreground">{option.label}</p>
            <p className="mt-2 text-xs text-muted-foreground italic leading-relaxed">
              &ldquo;{option.example}&rdquo;
            </p>
          </button>
        ))}
      </div>
    </motion.div>
  )
}
