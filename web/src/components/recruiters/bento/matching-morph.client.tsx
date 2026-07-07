"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

const RESUME = {
  name: "Alex Chen",
  role: "Staff Backend Engineer",
  stack: "Go · Kubernetes · PostgreSQL",
  score: 94,
}

const PROFILE = {
  name: "Alex Chen",
  role: "Staff Backend Engineer",
  match: "94% match",
  signals: ["Go expert", "K8s at scale", "Fintech exp"],
}

export function MatchingMorph() {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()
  const [showProfile, setShowProfile] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (reducedMotion) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reducedMotion])

  useEffect(() => {
    if (!visible || reducedMotion) return
    const id = setInterval(() => setShowProfile((v) => !v), 3500)
    return () => clearInterval(id)
  }, [visible, reducedMotion])

  if (reducedMotion) {
    return (
      <div className="rounded-xl bg-white/[0.03] p-4 text-xs text-[var(--recruit-muted)]">
        {PROFILE.name} — {PROFILE.match}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative h-36 overflow-hidden rounded-xl bg-white/[0.03] p-4">
      <AnimatePresence mode="wait">
        {!showProfile ? (
          <motion.div
            key="resume"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="space-y-2 text-xs"
          >
            <p className="font-semibold text-[var(--recruit-text)]">{RESUME.name}</p>
            <p className="text-[var(--recruit-muted)]">{RESUME.role}</p>
            <p className="font-mono text-[#5085fb]/70">{RESUME.stack}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#1447e6]"
                style={{ width: `${RESUME.score}%` }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.4 }}
            className="space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[var(--recruit-text)]">{PROFILE.name}</p>
              <span className="rounded-full bg-[#1447e6]/20 px-2 py-0.5 text-[10px] font-semibold text-[#5085fb]">
                {PROFILE.match}
              </span>
            </div>
            <p className="text-[var(--recruit-muted)]">{PROFILE.role}</p>
            <div className="flex flex-wrap gap-1">
              {PROFILE.signals.map((s) => (
                <span
                  key={s}
                  className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[var(--recruit-muted)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
