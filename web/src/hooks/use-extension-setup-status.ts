"use client"

import { useCallback, useEffect, useState } from "react"
import { getIntegrationStatus } from "@/app/actions"
import {
  EXTENSION_PING_TIMEOUT_MS,
  EXTENSION_PING_TYPE,
  EXTENSION_PONG_TYPE,
  EXTENSION_STATUS_POLL_MS,
} from "@/lib/extension-config"

export type ExtensionSetupSteps = {
  install: boolean
  connect: boolean
  firstDraft: boolean
}

export type ExtensionSetupStatus = {
  steps: ExtensionSetupSteps
  extensionInstalled: boolean
  extensionKeyIssued: boolean
  extensionConnected: boolean
  hasDrafted: boolean
  isPolling: boolean
}

function pingExtension(): Promise<{ installed: boolean; connected: boolean } | null> {
  if (typeof window === "undefined") return Promise.resolve(null)

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener("message", handler)
      resolve(null)
    }, EXTENSION_PING_TIMEOUT_MS)

    function handler(event: MessageEvent) {
      if (event.source !== window) return
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== EXTENSION_PONG_TYPE) return

      window.clearTimeout(timeoutId)
      window.removeEventListener("message", handler)
      resolve({
        installed: true,
        connected: Boolean(event.data.connected),
      })
    }

    window.addEventListener("message", handler)
    window.postMessage({ type: EXTENSION_PING_TYPE }, window.location.origin)
  })
}

function mergeStatus(
  ping: { installed: boolean; connected: boolean } | null,
  server: Awaited<ReturnType<typeof getIntegrationStatus>> | null
): ExtensionSetupStatus {
  const extensionKeyIssued = server?.extensionKeyIssued ?? false
  const extensionConnected = server?.extensionConnected ?? false
  const hasDrafted = server?.hasDrafted ?? false

  // Install must come from the extension itself responding to a ping — an
  // issued API key or a stale "connected" row only mean setup was started
  // somewhere, not that the extension is actually present in this browser.
  const extensionInstalled = Boolean(ping?.installed)

  // The server's extensionConnected (recent heartbeat) is the sole source of
  // truth — a ping's "connected" flag can be reported optimistically by the
  // extension before the backend link is real, so it's never enough alone.
  const connect = extensionConnected

  return {
    extensionInstalled,
    extensionKeyIssued,
    extensionConnected,
    hasDrafted,
    steps: {
      install: extensionInstalled,
      connect,
      firstDraft: hasDrafted,
    },
    isPolling: true,
  }
}

const idleStatus: ExtensionSetupStatus = {
  extensionInstalled: false,
  extensionKeyIssued: false,
  extensionConnected: false,
  hasDrafted: false,
  steps: { install: false, connect: false, firstDraft: false },
  isPolling: false,
}

export function useExtensionSetupStatus(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false
  const [status, setStatus] = useState<ExtensionSetupStatus>(idleStatus)

  const refresh = useCallback(async () => {
    if (!enabled) return idleStatus

    const [ping, server] = await Promise.all([
      pingExtension(),
      getIntegrationStatus().catch(() => null),
    ])

    const next = mergeStatus(ping, server)
    setStatus(next)
    return next
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setStatus(idleStatus)
      return
    }

    let cancelled = false

    const run = async () => {
      const [ping, server] = await Promise.all([
        pingExtension(),
        getIntegrationStatus().catch(() => null),
      ])
      if (!cancelled) {
        setStatus(mergeStatus(ping, server))
      }
    }

    void run()
    const intervalId = window.setInterval(() => {
      void run()
    }, EXTENSION_STATUS_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [enabled])

  return { status, refresh }
}
