"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { MapPin, Loader2 } from "lucide-react"
import {
  searchLocations,
  formatLocation,
  needsGeocodingResolution,
  type LocationSuggestion,
} from "@/lib/location-lookup"
import { AiInput } from "./ai-field"
import { cn } from "@/lib/utils"

export function LocationStep({
  value,
  onChange,
  aiFilled,
}: {
  value: string
  onChange: (value: string) => void
  aiFilled?: boolean
}) {
  const [query, setQuery] = useState(
    needsGeocodingResolution(value) ? value : value.split(",")[0]?.trim() ?? value
  )
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchLocations(query)
        setSuggestions(results)
        setOpen(results.length > 0)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    const formatted = formatLocation(suggestion)
    setQuery(suggestion.city)
    onChange(formatted)
    setOpen(false)
  }

  const resolved = value.trim() && !needsGeocodingResolution(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex-1 flex flex-col justify-center"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        Where are you based?
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Search for your city — we&apos;ll resolve state and postal code automatically.
      </p>

      <div ref={containerRef} className="relative">
        <AiInput
          aiFilled={aiFilled && !resolved}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            onChange("")
            setOpen(true)
          }}
          placeholder="Start typing a city..."
          autoFocus
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground animate-spin" />
        )}

        {open && suggestions.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full flex items-start gap-2 px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
                  onClick={() => selectSuggestion(s)}
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {resolved && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            "mt-4 text-sm rounded-lg px-4 py-3",
            "ring-1 ring-primary/30 bg-primary/5 text-foreground"
          )}
        >
          <span className="text-xs text-primary font-medium block mb-0.5">Selected location</span>
          {value}
        </motion.p>
      )}
    </motion.div>
  )
}
