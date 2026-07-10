"use client"

import { useEffect, useState } from "react"

type ReplyRateRingProps = {
  rate: number
  label?: string
  sublabel?: string
}

export function ReplyRateRing({ rate, label = "Reply rate", sublabel }: ReplyRateRingProps) {
  const [animated, setAnimated] = useState(0)
  const circumference = 2 * Math.PI * 54

  useEffect(() => {
    let frameId = 0
    const start = performance.now()
    const duration = 800
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimated(rate * eased)
      if (t < 1) frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [rate])

  const offset = circumference - (Math.min(animated, 100) / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative size-32">
        <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="text-primary transition-[stroke-dashoffset] duration-300"
            style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
            {Math.round(animated)}%
          </span>
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  )
}
