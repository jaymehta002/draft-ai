"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { DraftAIBrand } from "@/components/draft-ai-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const AUTH_MESSAGE_TYPE = "RECRUIT_PITCH_AUTH"
const CONNECT_TIMEOUT_MS = 20_000
const SLOW_CONNECT_HINT_MS = 8_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ErrorKind =
  | "invalid-state"
  | "onboarding"
  | "already-connected"
  | "rate-limited"
  | "timeout"
  | "offline"
  | "network"
  | "server"
  | "unknown"

interface ErrorInfo {
  kind: ErrorKind
  title: string
  message: string
  retryable: boolean
  action?: { label: string; href: string }
}

type ConnectPhase =
  | { step: "checking" }
  | { step: "missing-state" }
  | { step: "redirecting" }
  | { step: "connecting"; attempt: number }
  | { step: "success"; email: string }
  | { step: "error"; info: ErrorInfo; attempt: number }

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

function classifyError(status: number | null, code: string | undefined, rawMessage: string | undefined): ErrorInfo {
  const msg = (rawMessage || "").toLowerCase()

  if (code === "onboarding_incomplete" || msg.includes("onboarding")) {
    return {
      kind: "onboarding",
      title: "Profile incomplete",
      message: "Finish setting up your Draft AI profile, then reopen the extension to connect.",
      retryable: false,
      action: { label: "Complete your profile", href: "/onboarding" },
    }
  }

  if (code === "invalid_state" || code === "expired_state" || status === 400 || msg.includes("state")) {
    return {
      kind: "invalid-state",
      title: "Link expired",
      message: "This connection link was already used or has timed out. Start again from the extension.",
      retryable: false,
    }
  }

  if (code === "already_connected" || status === 409) {
    return {
      kind: "already-connected",
      title: "Already connected",
      message: "This extension is already linked to your account.",
      retryable: false,
    }
  }

  if (code === "rate_limited" || status === 429) {
    return {
      kind: "rate-limited",
      title: "Too many attempts",
      message: "Wait a minute before trying again.",
      retryable: true,
    }
  }

  if (status === 401 || status === 403) {
    return {
      kind: "invalid-state",
      title: "Session expired",
      message: "Sign in again to continue.",
      retryable: false,
    }
  }

  if (status !== null && status >= 500) {
    return {
      kind: "server",
      title: "Something went wrong",
      message: "Draft AI ran into a problem on our end. This is usually temporary.",
      retryable: true,
    }
  }

  return {
    kind: "unknown",
    title: "Couldn't connect",
    message: rawMessage || "An unexpected error occurred.",
    retryable: true,
  }
}

// ---------------------------------------------------------------------------
// Status mark — the one signature element. A thin ring that morphs between
// a slow spinner arc, a drawn checkmark, and a drawn X. No icon library.
// ---------------------------------------------------------------------------

function StatusMark({ state }: { state: "idle" | "connecting" | "success" | "error" }) {
  const reduceMotion = useReducedMotion()

  const ringClass =
    state === "success"
      ? "text-accent"
      : state === "error"
        ? "text-destructive/70"
        : "text-foreground/25"

  return (
    <div className="relative flex h-11 w-11 items-center justify-center">
      <svg viewBox="0 0 40 40" className={`h-11 w-11 ${ringClass} transition-colors duration-500`}>
        <circle cx="20" cy="20" r="17.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      </svg>

      <AnimatePresence mode="wait">
        {state === "connecting" && (
          <motion.svg
            key="spinner"
            viewBox="0 0 40 40"
            className="absolute inset-0 h-11 w-11 text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, rotate: reduceMotion ? 0 : 360 }}
            exit={{ opacity: 0 }}
            transition={
              reduceMotion
                ? { opacity: { duration: 0.2 } }
                : { rotate: { repeat: Infinity, duration: 1.6, ease: "linear" }, opacity: { duration: 0.2 } }
            }
          >
            <circle
              cx="20"
              cy="20"
              r="17.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeDasharray="18 92"
            />
          </motion.svg>
        )}

        {state === "success" && (
          <motion.svg
            key="check"
            viewBox="0 0 40 40"
            className="absolute inset-0 h-11 w-11 text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.path
              d="M13 20.5L18 25.5L27.5 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.1 }}
            />
          </motion.svg>
        )}

        {state === "error" && (
          <motion.svg
            key="x"
            viewBox="0 0 40 40"
            className="absolute inset-0 h-11 w-11 text-destructive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.path
              d="M14.5 14.5L25.5 25.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: 0.1 }}
            />
            <motion.path
              d="M25.5 14.5L14.5 25.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: 0.3 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

const fade = {
  initial: { opacity: 0, y: 3 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
  transition: { duration: 0.25 },
}

type ConnectResponse = {
  code?: string
  error?: string
  email?: string
  state?: string
  apiKey?: string
  name?: string
}

function ExtensionConnectContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const rawState = searchParams.get("state")
  const state = rawState && rawState.trim().length > 0 ? rawState : null

  const [phase, setPhase] = useState<ConnectPhase>(() =>
    state ? { step: "checking" } : { step: "missing-state" }
  )
  const [isSlow, setIsSlow] = useState(false)

  const hasStartedRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const attemptRef = useRef(0)

  const runConnect = useCallback(
    async (currentState: string) => {
      const attempt = attemptRef.current + 1
      attemptRef.current = attempt
      const sessionUserEmail = session?.user?.email

      setIsSlow(false)
      setPhase({ step: "connecting", attempt })

      const controller = new AbortController()
      abortRef.current = controller
      const timeoutId = setTimeout(() => controller.abort("timeout"), CONNECT_TIMEOUT_MS)
      const slowTimer = setTimeout(() => setIsSlow(true), SLOW_CONNECT_HINT_MS)

      try {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          throw { offline: true }
        }

        const initResponse = await fetch("/api/extension/connect/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: currentState }),
          signal: controller.signal,
        })

        if (!initResponse.ok) {
          let initData: { code?: string; error?: string } | null = null
          try {
            initData = await initResponse.json()
          } catch {
            initData = null
          }
          const info = classifyError(initResponse.status, initData?.code, initData?.error)
          setPhase({ step: "error", info: { ...info, message: initData?.error || info.message }, attempt })
          return
        }

        const response = await fetch("/api/extension/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: currentState }),
          signal: controller.signal,
        })

        let data: ConnectResponse | null = null
        try {
          data = (await response.json()) as ConnectResponse
        } catch {
          data = null
        }

        if (!response.ok) {
          const info = classifyError(response.status, data?.code, data?.error)
          if (info.kind === "already-connected") {
            setPhase({ step: "success", email: data?.email || sessionUserEmail || "" })
            return
          }
          setPhase({ step: "error", info: { ...info, message: data?.error || info.message }, attempt })
          return
        }

        try {
          const authMsg = {
            type: AUTH_MESSAGE_TYPE,
            state: data?.state ?? currentState,
            apiKey: data?.apiKey,
            email: data?.email,
            name: data?.name,
          }
          // Post immediately
          window.postMessage(authMsg, window.location.origin)
          
          // Post a few more times to ensure the content script catches it
          // in case of any race conditions during injection
          setTimeout(() => window.postMessage(authMsg, window.location.origin), 500)
          setTimeout(() => window.postMessage(authMsg, window.location.origin), 1500)
          setTimeout(() => window.postMessage(authMsg, window.location.origin), 3000)
        } catch {
          // Connection still succeeded server-side even if postMessage throws.
        }

        setPhase({ step: "success", email: data?.email || sessionUserEmail || "" })
      } catch (err: unknown) {
        const offline =
          typeof err === "object" && err !== null && "offline" in err && Boolean((err as { offline?: boolean }).offline)
        const name = err instanceof Error ? err.name : undefined
        if (offline) {
          setPhase({
            step: "error",
            info: { kind: "offline", title: "You're offline", message: "Reconnect and try again.", retryable: true },
            attempt,
          })
        } else if (name === "AbortError" || controller.signal.aborted) {
          setPhase({
            step: "error",
            info: {
              kind: "timeout",
              title: "Taking too long",
              message: "The request timed out. Draft AI may be temporarily unavailable.",
              retryable: true,
            },
            attempt,
          })
        } else {
          setPhase({
            step: "error",
            info: { kind: "network", title: "Couldn't reach Draft AI", message: "Check your connection and try again.", retryable: true },
            attempt,
          })
        }
      } finally {
        clearTimeout(timeoutId)
        clearTimeout(slowTimer)
        if (abortRef.current === controller) abortRef.current = null
      }
    },
    [session]
  )

  useEffect(() => {
    if (!state) return
    if (status === "loading") return
    if (status === "unauthenticated") {
      // External redirect — defer so we don't sync-setState in the effect body.
      const frame = requestAnimationFrame(() => {
        setPhase({ step: "redirecting" })
        signIn("google", { callbackUrl: `/extension/connect?state=${encodeURIComponent(state)}` })
      })
      return () => cancelAnimationFrame(frame)
    }
    if (status === "authenticated" && !hasStartedRef.current) {
      hasStartedRef.current = true
      void runConnect(state)
    }
  }, [state, status, runConnect])

  useEffect(() => () => abortRef.current?.abort("unmount"), [])

  const handleRetry = () => state && runConnect(state)
  const handleCloseTab = () => {
    try {
      window.close()
    } catch {
      // Script-initiated close can be blocked; the copy already tells them to close manually.
    }
  }

  const markState: "idle" | "connecting" | "success" | "error" =
    phase.step === "success" || (phase.step === "error" && phase.info.kind === "already-connected")
      ? "success"
      : phase.step === "error"
        ? "error"
        : phase.step === "connecting"
          ? "connecting"
          : "idle"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-sm border-border shadow-sm">
        <CardContent className="p-8 sm:p-10">
        <div className="mb-10 flex justify-center">
          <DraftAIBrand />
        </div>

        <p className="mb-8 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Extension connection
        </p>

        <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
          <StatusMark state={markState} />

          <div className="mt-6 min-h-[64px] w-full">
            <AnimatePresence mode="wait">
              {phase.step === "missing-state" && (
                <motion.div key="missing" {...fade}>
                  <p className="text-base font-medium text-foreground">Missing connection link</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Open the extension and choose &ldquo;Connect account&rdquo; to start again.
                  </p>
                </motion.div>
              )}

              {phase.step === "checking" && (
                <motion.p key="checking" {...fade} className="text-sm text-muted-foreground">
                  Checking your session
                </motion.p>
              )}

              {phase.step === "redirecting" && (
                <motion.p key="redirecting" {...fade} className="text-sm text-muted-foreground">
                  Redirecting to sign in
                </motion.p>
              )}

              {phase.step === "connecting" && (
                <motion.div key="connecting" {...fade}>
                  <p className="text-base font-medium text-foreground">Connecting your account</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {session?.user?.email ?? "Signing you in"}
                  </p>
                  {isSlow && (
                    <p className="mt-2 text-xs text-muted-foreground/70">Still working — this is taking a moment.</p>
                  )}
                </motion.div>
              )}

              {phase.step === "success" && (
                <motion.div key="success" {...fade}>
                  <p className="text-base font-medium text-foreground">Connected</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Signed in as {phase.email || "your Draft AI account"}. Close this tab and return to X or LinkedIn.
                  </p>
                </motion.div>
              )}

              {phase.step === "error" && (
                <motion.div key={`error-${phase.info.kind}-${phase.attempt}`} {...fade}>
                  <p className="text-base font-medium text-foreground">{phase.info.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{phase.info.message}</p>
                  {phase.attempt > 1 && (
                    <p className="mt-2 text-xs text-muted-foreground/60">Attempt {phase.attempt}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-2 flex items-center gap-5">
            {phase.step === "success" && (
              <Button variant="outline" size="sm" onClick={handleCloseTab}>
                Close this tab
              </Button>
            )}

            {phase.step === "error" && phase.info.retryable && (
              <Button size="sm" onClick={handleRetry}>
                Try again
              </Button>
            )}

            {phase.step === "error" && phase.info.action && (
              <a
                href={phase.info.action.href}
                className="text-sm text-foreground underline underline-offset-4 decoration-foreground/30 transition-colors hover:decoration-foreground"
              >
                {phase.info.action.label}
              </a>
            )}
          </div>

          {phase.step === "error" && phase.attempt >= 3 && (
            <p className="mt-8 max-w-xs text-xs leading-relaxed text-muted-foreground/70">
              Still stuck? Reopen the extension from your toolbar and start the connection fresh.
            </p>
          )}
        </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function ExtensionConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <StatusMark state="connecting" />
        </div>
      }
    >
      <ExtensionConnectContent />
    </Suspense>
  )
}