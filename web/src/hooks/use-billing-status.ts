"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { fetchBillingStatus, type BillingStatus } from "@/lib/billing-client"

let cachedStatus: BillingStatus | null = null
let inflight: Promise<BillingStatus> | null = null
let inflightVersion = 0
let latestAppliedVersion = 0
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return cachedStatus
}

function getServerSnapshot() {
  return null
}

function loadBillingStatus(force = false): Promise<BillingStatus> {
  if (!force && cachedStatus) return Promise.resolve(cachedStatus)
  if (!force && inflight) return inflight

  const version = ++inflightVersion
  const promise = fetchBillingStatus()
    .then((data) => {
      // A slower, older fetch resolving after a newer (e.g. forced) one must
      // not clobber the fresher result or re-notify subscribers with stale data.
      if (version > latestAppliedVersion) {
        latestAppliedVersion = version
        cachedStatus = data
        notify()
      }
      return data
    })
    .finally(() => {
      if (inflight === promise) inflight = null
    })

  inflight = promise
  return promise
}

export function invalidateBillingStatusCache() {
  cachedStatus = null
}

export function useBillingStatus(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false

  const sharedStatus = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const status = enabled ? sharedStatus : null

  const [loading, setLoading] = useState(enabled && !cachedStatus)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async (force = true) => {
    if (!enabled) return null
    setLoading(true)
    try {
      const next = await loadBillingStatus(force)
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
        await loadBillingStatus()
        if (!cancelled) setError(null)
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
