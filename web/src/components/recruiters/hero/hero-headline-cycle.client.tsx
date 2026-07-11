"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { EASE_OUT } from "@/lib/motion-tokens"

export function HeroHeadlineCycle({ headlines }: { headlines: string[] }) {
  const reducedMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reducedMotion || headlines.length <= 1) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % headlines.length)
    }, 4000)
    return () => clearInterval(id)
  }, [headlines.length, reducedMotion])

  const current = headlines[index] ?? headlines[0]

  if (reducedMotion) {
    return <>{headlines[0]}</>
  }

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={current}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="inline-block"
      >
        {current}
      </motion.span>
    </AnimatePresence>
  )
}
