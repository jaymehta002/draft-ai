"use client"

import { useEffect } from "react"

const PENDING_REF_KEY = "draft_ai_pending_ref"

/**
 * Drop-in for public pages (e.g. /try). Persists an inbound `?ref=CODE` so it
 * can be redeemed once the visitor signs up.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref")
      if (code) localStorage.setItem(PENDING_REF_KEY, code.trim().toUpperCase())
    } catch {
      // ignore storage errors
    }
  }, [])
  return null
}

/**
 * Mounted in the authenticated dashboard. Redeems any captured referral code
 * exactly once, then clears it.
 */
export function ReferralRedeemer() {
  useEffect(() => {
    let code: string | null = null
    try {
      code = localStorage.getItem(PENDING_REF_KEY)
    } catch {
      return
    }
    if (!code) return

    fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .catch(() => {})
      .finally(() => {
        try {
          localStorage.removeItem(PENDING_REF_KEY)
        } catch {
          // ignore
        }
      })
  }, [])
  return null
}
