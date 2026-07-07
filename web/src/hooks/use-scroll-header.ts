"use client"

import { useEffect, useRef, useState } from "react"

export function useScrollHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const reduceMotion = useRef(false)

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 24)
      if (!reduceMotion.current) {
        if (y > 120 && y > lastY.current) setHidden(true)
        else setHidden(false)
      }
      lastY.current = y
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return { scrolled, hidden }
}
