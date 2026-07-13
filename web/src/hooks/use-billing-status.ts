"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchBillingStatus, type BillingStatus } from "@/lib/billing-client"

let cachedStatus: BillingStatus | null = null
let inflight: Promise<BillingStatus> | null = null

function loadBillingStatus(force = false): Promise<BillingStatus> {
  if (!force && cachedStatus) return Promise.resolve(cachedStatus)
  if (!force && inflight) return inflight

  inflight = fetchBillingStatus()
    .then((data) => {
      cachedStatus = data
      return data
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

export function invalidateBillingStatusCache() {
  cachedStatus = null
}

export function useBillingStatus(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const [status, setStatus] = useState<BillingStatus | null>(enabled ? cachedStatus : null)
  const [loading, setLoading] = useState(enabled && !cachedStatus)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = true) => {
    if (!enabled) return null
    setLoading(true)
    try {
      const next = await loadBillingStatus(force)
      setStatus(next)
      setError(null)
      return next
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load billing"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    const run = async () => {
      setLoading((prev) => prev || !cachedStatus)
      try {
        const next = await loadBillingStatus()
        if (!cancelled) {
          setStatus(next)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load billing")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return { status, loading, error, refresh }
}
