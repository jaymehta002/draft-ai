import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ExternalLink, LogOut, Loader2, Check, TrendingUp, Send, FileText, Circle, Flame } from "lucide-react"
import "./style.css"
import { DraftAIBrand } from "~components/draft-ai-brand"
import { StatusBanner, type StatusNote } from "~components/status-banner"
import { WEB_URL } from "~lib/config"
import type { AuthState } from "~lib/config"
import { cn } from "~lib/utils"

const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const

// ---------------------------------------------------------------------------
// Load state
// ---------------------------------------------------------------------------
// "cold"   — nothing cached yet, waiting on the background script (skeleton)
// "warm"   — rendered instantly from chrome.storage.local, reconciling quietly
// "ready"  — background has confirmed the current state, nothing in flight

type LoadState = "cold" | "warm" | "ready"

type Analytics = {
  sentToday: number
  sentThisWeek: number
  totalSent: number
  draftsToday: number
  totalReplied?: number
  repliedThisWeek?: number
  replyRate?: number
  replyRate7d?: number
  currentStreak?: number
  weeklyGoal?: number
  weekProgress?: number
  milestones?: string[]
}

type ExtensionStatus = {
  hasProfile: boolean
  gmailConnected: boolean
  hasDrafted: boolean
}

type BillingSummary = {
  tier: string
  draftsRemaining: number
  emailsRemaining: number
}

const TIER_LABEL: Record<string, string> = { FREE: "Free", BASIC: "Basic", PRO: "Pro" }

function PlanBadge({ billing }: { billing: BillingSummary }) {
  const isPaid = billing.tier !== "FREE"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isPaid ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}
    >
      {TIER_LABEL[billing.tier] ?? billing.tier}
    </span>
  )
}

function WeeklyGoalRing({
  progress,
  goal,
  onGoalChange,
}: {
  progress: number
  goal: number
  onGoalChange: (g: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const pct = goal > 0 ? Math.min((progress / goal) * 100, 100) : 0
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0">
          <svg className="size-12 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              stroke="var(--success)"
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
            {progress}/{goal}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">Weekly goal</p>
          <p className="text-[10px] text-muted-foreground">conversations started</p>
          {editing ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {[3, 5, 10, 15].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    onGoalChange(g)
                    setEditing(false)
                  }}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    g === goal
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-1 text-[10px] text-primary hover:underline"
            >
              Change goal
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EngagementRow({
  analytics,
  onGoalChange,
}: {
  analytics: Analytics
  onGoalChange: (g: number) => void
}) {
  const streak = analytics.currentStreak ?? 0
  const goal = analytics.weeklyGoal ?? 5
  const progress = analytics.weekProgress ?? 0

  return (
    <div className="space-y-3">
      {streak > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--streak-border)] bg-[var(--streak-bg)] px-3 py-2">
          <Flame className="h-4 w-4 text-[var(--streak-icon)]" />
          <span className="text-xs font-semibold text-[var(--streak-text)]">
            {streak}-day conversation streak
          </span>
        </div>
      )}
      <WeeklyGoalRing progress={progress} goal={goal} onGoalChange={onGoalChange} />
    </div>
  )
}

function SetupChecklist({
  auth,
  analytics,
  status,
}: {
  auth: AuthState | null
  analytics: Analytics | null
  status: ExtensionStatus | null
}) {
  const steps = [
    {
      label: auth ? "Profile ready" : "Sign in on web",
      done: status?.hasProfile ?? false,
      href: `${WEB_URL}/onboarding`,
    },
    {
      label: "Extension connected",
      done: Boolean(auth?.apiKey),
      href: null,
    },
    {
      label: "Gmail ready",
      done: status?.gmailConnected ?? false,
      href: `${WEB_URL}/dashboard/extension`,
    },
    {
      label: "First outreach",
      done:
        (analytics?.draftsToday ?? 0) > 0 ||
        (analytics?.totalSent ?? 0) > 0 ||
        (status?.hasDrafted ?? false),
      href: null,
    },
  ]

  const completed = steps.filter((s) => s.done).length
  const allDone = completed === steps.length

  if (allDone) {
    return (
      <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-medium text-[var(--success-text)]">
          <Check className="h-3.5 w-3.5" />
          All set — click Draft on any post
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        Setup · {completed} of {steps.length} complete
      </p>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2 text-xs">
            {step.done ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--success)]" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            )}
            {step.href && !step.done ? (
              <a
                href={step.href}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {step.label}
              </a>
            ) : (
              <span className={step.done ? "text-muted-foreground" : "text-foreground"}>
                {step.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function IndexPopup() {
  const [enabled, setEnabled] = useState(true)
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [loadState, setLoadState] = useState<LoadState>("cold")
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus | null>(null)
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [fetchError, setFetchError] = useState<StatusNote | null>(null)

  const renderedFromCache = useRef(false)
  const lastFetchTime = useRef<number>(0)
  const statusMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const CACHE_DURATION = 30000 // 30 seconds

  const showStatusMessage = (text: string, duration = 3000) => {
    if (statusMessageTimer.current) clearTimeout(statusMessageTimer.current)
    setStatusMessage(text)
    statusMessageTimer.current = setTimeout(() => {
      setStatusMessage(null)
      statusMessageTimer.current = null
    }, duration)
  }

  useEffect(() => {
    return () => {
      if (statusMessageTimer.current) clearTimeout(statusMessageTimer.current)
    }
  }, [])

  const revalidate = (_opts: { silent: boolean }) => {
    setSyncing(true)
    setFetchError(null)

    chrome.runtime.sendMessage({ type: "GET_AUTH" }, (response) => {
      setSyncing(false)
      setLoadState("ready")
      if (response?.success && response.auth) {
        setAuth(response.auth)
        fetchAnalytics(response.auth)
        fetchExtensionStatus(response.auth)
        fetchBilling(response.auth)
      } else {
        setAuth(null)
        setAnalytics(null)
        setExtensionStatus(null)
        setBilling(null)
      }
    })
  }

  const fetchExtensionStatus = async (authState: AuthState) => {
    try {
      const response = await fetch(`${WEB_URL}/api/extension/status`, {
        headers: { Authorization: `Bearer ${authState.apiKey}` },
      })
      if (response.ok) {
        const data = await response.json()
        setExtensionStatus({
          hasProfile: data.hasProfile,
          gmailConnected: data.gmailConnected,
          hasDrafted: data.hasDrafted,
        })
      } else {
        setFetchError({ tone: "error", text: "Couldn't load your setup status." })
      }
    } catch (error) {
      console.error("Failed to fetch extension status:", error)
      setFetchError({ tone: "error", text: "Couldn't load your setup status. Check your connection." })
    }
  }

  const fetchBilling = async (authState: AuthState) => {
    try {
      const response = await fetch(`${WEB_URL}/api/billing/status`, {
        headers: { Authorization: `Bearer ${authState.apiKey}` },
      })
      if (response.ok) {
        const data = await response.json()
        setBilling({
          tier: data.effectiveTier,
          draftsRemaining: data.remaining?.drafts ?? 0,
          emailsRemaining: data.remaining?.emails ?? 0,
        })
      } else {
        setFetchError({ tone: "error", text: "Couldn't load your plan usage." })
      }
    } catch (error) {
      console.error("Failed to fetch billing status:", error)
      setFetchError({ tone: "error", text: "Couldn't load your plan usage. Check your connection." })
    }
  }

  const fetchAnalytics = async (authState: AuthState, force = false) => {
    const now = Date.now()

    if (!force && now - lastFetchTime.current < CACHE_DURATION) {
      return
    }

    setAnalyticsLoading(true)
    try {
      const response = await fetch(`${WEB_URL}/api/extension/analytics`, {
        headers: {
          Authorization: `Bearer ${authState.apiKey}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
        lastFetchTime.current = now

        chrome.storage.local.set({
          cachedAnalytics: data,
          analyticsCacheTime: now,
        })
      } else {
        setFetchError({ tone: "error", text: "Couldn't load your stats." })
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
      setFetchError({ tone: "error", text: "Couldn't load your stats. Check your connection." })
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const initAuth = async () => {
      const result = await chrome.storage.local.get(["enabled", "apiKey", "userEmail", "cachedAnalytics", "analyticsCacheTime"])

      if (cancelled) return

      if (result.enabled !== undefined) setEnabled(result.enabled)

      if (result.apiKey && result.userEmail) {
        const authState = { apiKey: result.apiKey, userEmail: result.userEmail } as AuthState
        setAuth(authState)
        setLoadState("warm")
        renderedFromCache.current = true

        if (result.cachedAnalytics) {
          setAnalytics(result.cachedAnalytics)
          lastFetchTime.current = result.analyticsCacheTime || 0
        }

        fetchAnalytics(authState)
        fetchExtensionStatus(authState)
        chrome.runtime.sendMessage({ type: "SEND_HEARTBEAT" })
      }

      revalidate({ silent: renderedFromCache.current })
    }

    initAuth().catch(() => {
      if (!cancelled) revalidate({ silent: false })
    })

    const onStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return
      if (changes.apiKey || changes.userEmail) {
        revalidate({ silent: true })
        setConnecting(false)
        showStatusMessage("Connected")
      }
    }

    chrome.storage.onChanged.addListener(onStorageChange)
    return () => {
      cancelled = true
      chrome.storage.onChanged.removeListener(onStorageChange)
    }
  }, [])

  const handleConnect = () => {
    setConnecting(true)
    setStatusMessage(null)
    chrome.runtime.sendMessage({ type: "START_CONNECT" }, (response) => {
      if (!response?.success) {
        setConnecting(false)
        showStatusMessage(response?.error || "Failed to open dashboard")
      }
    })
  }

  const handleGoalChange = async (goal: number) => {
    if (!auth?.apiKey) return
    try {
      const response = await fetch(`${WEB_URL}/api/extension/engagement`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ weeklyGoal: goal }),
      })
      if (response.ok) {
        setAnalytics((prev) => (prev ? { ...prev, weeklyGoal: goal } : prev))
        fetchAnalytics(auth, true)
      } else {
        setFetchError({ tone: "error", text: "Couldn't update your weekly goal." })
      }
    } catch (error) {
      console.error("Failed to update weekly goal:", error)
      setFetchError({ tone: "error", text: "Couldn't update your weekly goal. Check your connection." })
    }
  }

  const handleDisconnect = () => {
    chrome.runtime.sendMessage({ type: "DISCONNECT" }, () => {
      setAuth(null)
      setAnalytics(null)
      showStatusMessage("Disconnected")
    })
  }

  if (loadState === "cold") {
    return <PopupSkeleton />
  }

  return (
    <div className="w-80 bg-background font-sans text-foreground">
      <div className="relative border-b border-border bg-background px-5 py-4">
        <div className="flex items-start justify-between">
          <DraftAIBrand subtitle="Outreach Studio" showSyncIndicator={syncing} />
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked)
                chrome.storage.local.set({ enabled: e.target.checked })
              }}
              className="peer sr-only"
              disabled={!auth}
            />
            <div className="h-5 w-10 rounded-full bg-muted transition-[background-color] duration-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-[transform] after:duration-200 peer-checked:bg-primary peer-checked:after:translate-x-5 peer-disabled:opacity-40" />
          </label>
        </div>
      </div>

      <div className="relative max-h-[600px] overflow-y-auto">
        <div className="space-y-4 p-5">
          <AnimatePresence mode="wait">
            {fetchError && (
              <StatusBanner key={fetchError.text} tone={fetchError.tone}>
                <span className="flex items-center justify-between gap-2">
                  {fetchError.text}
                  <button
                    type="button"
                    onClick={() => revalidate({ silent: true })}
                    className="shrink-0 font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </span>
              </StatusBanner>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {auth ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                className="space-y-4"
              >
            <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                  Connected
                </p>
                {billing && <PlanBadge billing={billing} />}
              </div>
              <p className="truncate text-sm font-medium text-foreground">{auth.userEmail}</p>
              {billing && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {billing.draftsRemaining.toLocaleString()} drafts ·{" "}
                  {billing.emailsRemaining.toLocaleString()} emails left this period
                </p>
              )}
            </div>

            {analyticsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <SkeletonBar className="h-24 w-full rounded-xl" />
                <SkeletonBar className="h-24 w-full rounded-xl" />
                <SkeletonBar className="h-24 w-full rounded-xl" />
                <SkeletonBar className="h-24 w-full rounded-xl" />
              </div>
            ) : analytics ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: EASE_SMOOTH }}
                className="space-y-4"
              >
                <EngagementRow
                  analytics={analytics}
                  onGoalChange={handleGoalChange}
                />
                <div className="grid grid-cols-2 gap-3 items-stretch">
                  {[
                    { icon: <Send className="h-4 w-4" />, label: "Started today", value: analytics.sentToday },
                    { icon: <FileText className="h-4 w-4" />, label: "Drafts today", value: analytics.draftsToday },
                    { icon: <TrendingUp className="h-4 w-4" />, label: "This week", value: analytics.sentThisWeek },
                    {
                      icon: <Check className="h-4 w-4" />,
                      label: "Reply rate",
                      value: `${analytics.replyRate ?? 0}%`,
                      sub: `${analytics.totalReplied ?? 0} replied`,
                    },
                  ].map((card, i) => (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: EASE_SMOOTH, delay: i * 0.04 }}
                      className="h-full"
                    >
                      <StatCard {...card} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}

            <SetupChecklist auth={auth} analytics={analytics} status={extensionStatus} />

            <button
              onClick={handleDisconnect}
              className="btn-secondary text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: EASE_SMOOTH }}
                className="space-y-4"
              >
            <SetupChecklist auth={null} analytics={null} status={null} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connect your account to draft personalized outreach on X and LinkedIn.
            </p>
            <button onClick={handleConnect} disabled={connecting} className="btn-primary">
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Connect account"
              )}
            </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {statusMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-center text-xs font-medium text-primary"
              >
                {statusMessage}
              </motion.p>
            )}
          </AnimatePresence>

          <a
            href={`${WEB_URL}/dashboard/extension`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open dashboard
          </a>
        </div>
        <div className="pointer-events-none sticky bottom-0 -mt-6 h-6 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sub?: string
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card px-3 py-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">{icon}</div>
      <p className="mb-0.5 text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 min-h-[13px] text-[10px] text-muted-foreground/80">{sub}</p>
    </div>
  )
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />
}

function PopupSkeleton() {
  return (
    <div className="w-80 bg-background font-sans">
      <div className="border-b border-border bg-background px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-3 w-28" />
          </div>
          <SkeletonBar className="h-5 w-10 !rounded-full" />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <SkeletonBar className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBar className="h-20 w-full rounded-xl" />
          <SkeletonBar className="h-20 w-full rounded-xl" />
          <SkeletonBar className="h-20 w-full rounded-xl" />
          <SkeletonBar className="h-20 w-full rounded-xl" />
        </div>
        <SkeletonBar className="h-14 w-full rounded-xl" />
        <div className="flex justify-center pt-1">
          <SkeletonBar className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
