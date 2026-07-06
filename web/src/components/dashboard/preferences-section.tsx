"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { saveOutreachPreferences } from "@/app/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Polished and personable" },
  { value: "warm", label: "Warm", description: "Friendly and conversational" },
  { value: "direct", label: "Direct", description: "Concise and to the point" },
  { value: "formal", label: "Formal", description: "Respectful and executive-ready" },
] as const

const LENGTH_OPTIONS = [
  { value: "short", label: "Short", description: "~80 words" },
  { value: "medium", label: "Medium", description: "~150 words" },
  { value: "long", label: "Long", description: "~250 words" },
] as const

export function PreferencesSection({
  outreachTone,
  draftLength,
  outreachLanguage,
}: {
  outreachTone: string
  draftLength: string
  outreachLanguage: string
}) {
  const [tone, setTone] = useState(outreachTone || "professional")
  const [length, setLength] = useState(draftLength || "medium")
  const [language, setLanguage] = useState(outreachLanguage || "en")
  const [saved, setSaved] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = useCallback((next: { outreachTone: string; draftLength: string; outreachLanguage: string }) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      await saveOutreachPreferences(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 500)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const updateTone = (value: string) => {
    setTone(value)
    persist({ outreachTone: value, draftLength: length, outreachLanguage: language })
  }

  const updateLength = (value: string) => {
    setLength(value)
    persist({ outreachTone: tone, draftLength: value, outreachLanguage: language })
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Outreach preferences</CardTitle>
            <CardDescription>
              Customize how Draft AI generates messages for you.
            </CardDescription>
          </div>
          {saved && (
            <span className="text-xs font-medium text-chart-2">Saved</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Tone</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TONE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateTone(option.value)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color] duration-200",
                  tone === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                )}
              >
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground mb-3">Draft length</p>
          <div className="flex flex-wrap gap-2">
            {LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateLength(option.value)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm transition-[border-color,background-color] duration-200",
                  length === option.value
                    ? "border-primary bg-primary/5 font-medium text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {option.label}
                <span className="ml-1.5 text-xs opacity-70">{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border/50">
          <div>
            <p className="text-sm font-medium text-foreground">Language</p>
            <p className="text-xs text-muted-foreground mt-0.5">Language for generated outreach</p>
          </div>
          <span className="text-sm text-muted-foreground">
            {language === "en" ? "English" : language}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
