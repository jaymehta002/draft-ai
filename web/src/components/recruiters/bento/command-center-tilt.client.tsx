"use client"

import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"

const PIPELINE = [
  { stage: "Sourced", count: 47 },
  { stage: "Ranked", count: 12 },
  { stage: "Interview", count: 5 },
  { stage: "Offer", count: 2 },
]

export function CommandCenterTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const rotateX = useTransform(scrollYProgress, [0, 1], [8, -4])
  const rotateY = useTransform(scrollYProgress, [0, 1], [-6, 6])

  if (reducedMotion) {
    return <StaticPreview />
  }

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
      }}
      className="h-36 rounded-xl bg-white/[0.03] p-4"
    >
      <StaticPreview />
    </motion.div>
  )
}

function StaticPreview() {
  return (
    <div className="flex h-full flex-col justify-between">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--recruit-muted)]">
        Pipeline
      </p>
      <div className="flex gap-2">
        {PIPELINE.map((p) => (
          <div key={p.stage} className="flex-1 rounded-lg bg-white/[0.04] p-2 text-center">
            <p className="font-serif text-lg text-[var(--recruit-text)]">{p.count}</p>
            <p className="text-[9px] text-[var(--recruit-muted)]">{p.stage}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
