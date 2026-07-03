"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Plus, Loader2, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SkillsChipsStep({
  confirmed,
  suggested,
  customSkills,
  onChange,
  loading,
}: {
  confirmed: string[]
  suggested: string[]
  customSkills: string[]
  onChange: (skills: string[]) => void
  loading: boolean
}) {
  const [input, setInput] = useState("")
  const allSelected = [...new Set([...confirmed, ...customSkills])]
  const unselectedSuggested = suggested.filter((s) => !allSelected.includes(s))

  const toggleSkill = (skill: string) => {
    if (allSelected.includes(skill)) {
      onChange(allSelected.filter((s) => s !== skill))
    } else {
      onChange([...allSelected, skill])
    }
  }

  const addCustom = () => {
    const trimmed = input.trim()
    if (!trimmed || allSelected.includes(trimmed)) return
    onChange([...allSelected, trimmed])
    setInput("")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col justify-center"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        What are your key skills?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        {loading
          ? "Suggesting skills based on your experience..."
          : "We suggested these from your profile. Remove any that don't fit, or add your own."}
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {allSelected.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  "bg-primary/10 text-primary ring-1 ring-primary/30"
                )}
              >
                <Sparkles className="h-3 w-3" />
                {skill}
                <X className="h-3.5 w-3.5 opacity-60" />
              </button>
            ))}
          </div>

          {unselectedSuggested.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                Maybe relevant
              </p>
              <div className="flex flex-wrap gap-2">
                {unselectedSuggested.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
                      "bg-muted text-muted-foreground hover:bg-muted/80 border border-dashed border-border"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
              placeholder="Add a skill..."
              className="h-12 text-base"
            />
            <button
              type="button"
              onClick={addCustom}
              className="shrink-0 h-12 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Add
            </button>
          </div>
        </>
      )}
    </motion.div>
  )
}
