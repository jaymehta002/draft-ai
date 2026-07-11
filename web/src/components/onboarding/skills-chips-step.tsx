"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Plus, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SkillsChipsStep({
  confirmed,
  suggested,
  customSkills,
  onChange,
  loading,
  onSubmit,
}: {
  confirmed: string[]
  suggested: string[]
  customSkills: string[]
  onChange: (skills: string[]) => void
  loading: boolean
  /** Called on Enter only when the add-skill input is empty — otherwise Enter adds the typed skill. */
  onSubmit?: () => void
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
                  "inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent-foreground transition-[background-color,color,border-color,box-shadow] duration-200 hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                      "inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-[background-color,color,border-color] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                e.preventDefault()
                if (input.trim()) {
                  addCustom()
                } else {
                  onSubmit?.()
                }
              }}
              placeholder="Add a skill..."
              className="h-12 text-base"
            />
            <Button type="button" onClick={addCustom} size="lg" className="shrink-0">
              Add
            </Button>
          </div>
        </>
      )}
    </motion.div>
  )
}
