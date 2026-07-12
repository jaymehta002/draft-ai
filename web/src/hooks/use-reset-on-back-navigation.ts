"use client"

import { useEffect, useRef } from "react"

/**
 * Resets transient "in-flight" UI state (e.g. a disabled button) when the
 * page is restored from the browser's back/forward cache instead of a fresh
 * load. `window.location.href = ...` to an external payment page doesn't
 * unmount the React tree — pressing the browser back button can restore that
 * exact frozen state (button still disabled from the click that navigated
 * away) instead of remounting, since no real reload happened.
 */
export function useResetOnBackNavigation(reset: () => void) {
  const resetRef = useRef(reset)
  useEffect(() => {
    resetRef.current = reset
  })

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetRef.current()
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])
}
