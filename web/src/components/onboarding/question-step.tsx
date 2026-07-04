"use client"

import { motion } from "framer-motion"
import type { FieldConfig } from "@/lib/onboarding-fields"
import type { CandidateProfileData } from "@/lib/candidate-profile"
import { AiInput, AiTextarea } from "./ai-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function QuestionStep({
  config,
  value,
  onChange,
  aiFilled,
}: {
  config: FieldConfig
  value: string
  onChange: (value: string) => void
  aiFilled?: boolean
}) {
  const emptySelectValue = "__empty__"
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col justify-center"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-8 leading-tight">
        {config.question}
      </h1>

      {config.inputType === "textarea" ? (
        <AiTextarea
          aiFilled={aiFilled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          autoFocus
        />
      ) : config.inputType === "select" ? (
        <Select
          value={value || emptySelectValue}
          onValueChange={(nextValue) => onChange(nextValue === emptySelectValue ? "" : nextValue)}
        >
          <SelectTrigger
            className={aiFilled ? "h-12 bg-accent/10 ring-1 ring-ring/30" : "h-12"}
            autoFocus
          >
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={emptySelectValue}>Select...</SelectItem>
            {config.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <AiInput
          aiFilled={aiFilled}
          type={config.inputType === "number" ? "number" : config.inputType === "url" ? "url" : "text"}
          min={config.inputType === "number" ? "0" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          autoFocus
        />
      )}
    </motion.div>
  )
}

export function ExtractionRevealStep({
  fields,
  profile,
  aiFilledFields,
}: {
  fields: { key: keyof CandidateProfileData; label: string }[]
  profile: CandidateProfileData
  aiFilledFields: Set<keyof CandidateProfileData>
}) {
  const filled = fields.filter((f) => {
    const val = profile[f.key]
    return typeof val === "string" && val.trim() && aiFilledFields.has(f.key)
  })

  if (filled.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col justify-center"
      >
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
          Let&apos;s fill in your details
        </h1>
        <p className="text-muted-foreground text-lg">
          We couldn&apos;t extract much from your resume — we&apos;ll ask you a few quick questions.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col justify-center"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3">
        Found on your resume
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        We pre-filled {filled.length} field{filled.length !== 1 ? "s" : ""} for you.
      </p>

      <div className="space-y-3">
        {filled.map((field, i) => {
          const val = profile[field.key]
          const display = typeof val === "string" ? val : ""
          return (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.18, duration: 0.25 }}
            className="rounded-lg ring-1 ring-primary/30 bg-primary/5 px-4 py-3"
          >
            <p className="text-xs text-primary font-medium mb-0.5">{field.label}</p>
            <p className="text-sm text-foreground line-clamp-2">
              {display}
            </p>
          </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
