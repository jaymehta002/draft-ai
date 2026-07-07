"use client"

import { Children, useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"

export function ParadigmScroll({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  const oldOpacity = useTransform(scrollYProgress, [0, 0.35, 0.5], [1, 0.4, 0])
  const oldBlur = useTransform(scrollYProgress, [0, 0.5], [0, 8])
  const oldFilter = useTransform(oldBlur, (b) => `blur(${b}px)`)

  const newOpacity = useTransform(scrollYProgress, [0.35, 0.55, 0.75], [0, 0.6, 1])
  const newBlur = useTransform(scrollYProgress, [0.35, 0.75], [8, 0])
  const newFilter = useTransform(newBlur, (b) => `blur(${b}px)`)

  if (reducedMotion) {
    return <div className="paradigm-panels">{children}</div>
  }

  const [oldPanel, newPanel] = Children.toArray(children)

  return (
    <div ref={containerRef} className="relative h-[200vh]">
      <div className="sticky top-24">
        <div className="relative grid min-h-[420px] gap-6 lg:grid-cols-2">
          <motion.div
            style={{ opacity: oldOpacity, filter: oldFilter }}
            className="lg:absolute lg:inset-y-0 lg:left-0 lg:w-[calc(50%-0.75rem)]"
          >
            {oldPanel}
          </motion.div>
          <motion.div
            style={{ opacity: newOpacity, filter: newFilter }}
            className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-[calc(50%-0.75rem)]"
          >
            {newPanel}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
