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
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      debounceRef.current = setTimeout(() => {
        setSuggestions([])
      }, 0)
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
      }
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchLocations(query)
        setSuggestions(results)
        setOpen(results.length > 0)
        setHighlightedIndex(0)
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
    setHighlightedIndex(0)
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
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) {
              if (e.key === "ArrowDown" && suggestions.length > 0) {
                e.preventDefault()
                setOpen(true)
              }
              return
            }

            if (e.key === "ArrowDown") {
              e.preventDefault()
              setHighlightedIndex((prev) => (prev + 1) % suggestions.length)
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
            } else if (e.key === "Enter") {
              e.preventDefault()
              selectSuggestion(suggestions[highlightedIndex]!)
            } else if (e.key === "Escape") {
              e.preventDefault()
              setOpen(false)
            }
          }}
          placeholder="Start typing a city..."
          autoFocus
          role="combobox"
          aria-expanded={open}
          aria-controls="location-suggestions"
          aria-autocomplete="list"
          aria-activedescendant={
            open && suggestions[highlightedIndex]
              ? `location-suggestion-${suggestions[highlightedIndex]!.id}`
              : undefined
          }
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3.5 h-5 w-5 text-muted-foreground animate-spin" />
        )}

        {open && suggestions.length > 0 && (
          <ul
            id="location-suggestions"
            role="listbox"
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          >
            {suggestions.map((s, index) => (
              <li key={s.id} id={`location-suggestion-${s.id}`} role="option" aria-selected={index === highlightedIndex}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
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
