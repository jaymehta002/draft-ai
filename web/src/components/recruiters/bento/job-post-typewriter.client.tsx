"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"

const FULL_JD = `We're looking for a Staff Backend Engineer to lead our payments infrastructure. You'll design high-throughput Go services on Kubernetes, own PostgreSQL schema evolution, and mentor a team of 4. Remote US, $180–220k + equity.`

export function JobPostTypewriter({ prompt }: { prompt: string }) {
  const reducedMotion = useReducedMotion()
  const [displayed, setDisplayed] = useState(prompt)

  useEffect(() => {
    if (reducedMotion) {
      setDisplayed(FULL_JD)
      return
    }

    let i = 0
    setDisplayed("")
    const id = setInterval(() => {
      i += 1
      setDisplayed(FULL_JD.slice(0, i))
      if (i >= FULL_JD.length) clearInterval(id)
    }, 18)
    return () => clearInterval(id)
  }, [reducedMotion])

  return (
    <div className="h-36 overflow-hidden rounded-xl bg-white/[0.03] p-4">
      <p className="mb-2 font-mono text-[10px] text-[#5085fb]/60">Generated JD</p>
      <p className="text-xs leading-relaxed text-[var(--recruit-muted)]">
        {displayed}
        {!reducedMotion && displayed.length < FULL_JD.length && (
          <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-[#5085fb]" />
        )}
      </p>
      <noscript>
        <p className="mt-2 text-xs text-[var(--recruit-muted)]">{FULL_JD}</p>
      </noscript>
    </div>
  )
}
