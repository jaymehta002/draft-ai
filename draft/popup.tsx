import { useEffect, useRef, useState } from "react"
import { ExternalLink, LogOut, Loader2, Check, TrendingUp, Send, FileText } from "lucide-react"
import "./style.css"
import { WEB_URL } from "~lib/config"
import type { AuthState } from "~lib/config"

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

  const renderedFromCache = useRef(false)
  const lastFetchTime = useRef<number>(0)
  const CACHE_DURATION = 30000 // 30 seconds

  // Confirms state with the background script. Runs silently when we've
  // already painted from cache, so it never re-introduces a loading state
  // the user has to wait through.
  const revalidate = (_opts: { silent: boolean }) => {
    setSyncing(true)

    chrome.runtime.sendMessage({ type: "GET_AUTH" }, (response) => {
      setSyncing(false)
      setLoadState("ready")
      if (response?.success && response.auth) {
        setAuth(response.auth)
        fetchAnalytics(response.auth)
      } else {
        setAuth(null)
        setAnalytics(null)
      }
    })
  }

  const fetchAnalytics = async (authState: AuthState, force = false) => {
    const now = Date.now()

    // Skip if fetched recently (unless forced)
    if (!force && analytics && (now - lastFetchTime.current) < CACHE_DURATION) {
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

        // Cache in chrome.storage for next open
        chrome.storage.local.set({
          cachedAnalytics: data,
          analyticsCacheTime: now,
        })
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    // Fetch analytics every time popup opens
    const initAuth = async () => {
      const result = await chrome.storage.local.get(["enabled", "apiKey", "userEmail", "cachedAnalytics", "analyticsCacheTime"])

      if (cancelled) return

      if (result.enabled !== undefined) setEnabled(result.enabled)

      if (result.apiKey && result.userEmail) {
        const authState = { apiKey: result.apiKey, userEmail: result.userEmail } as AuthState
        setAuth(authState)
        setLoadState("warm")
        renderedFromCache.current = true

        // Load cached analytics immediately for instant display
        if (result.cachedAnalytics) {
          setAnalytics(result.cachedAnalytics)
          lastFetchTime.current = result.analyticsCacheTime || 0
        }

        // Fetch fresh analytics
        fetchAnalytics(authState)
      }

      // Always reconcile
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
        setStatusMessage("Connected")
        setTimeout(() => setStatusMessage(null), 3000)
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
        setStatusMessage(response?.error || "Failed to open dashboard")
      }
    })
  }

  const handleDisconnect = () => {
    chrome.runtime.sendMessage({ type: "DISCONNECT" }, () => {
      setAuth(null)
      setAnalytics(null)
      setStatusMessage("Disconnected")
      setTimeout(() => setStatusMessage(null), 3000)
    })
  }

  if (loadState === "cold") {
    return <PopupSkeleton />
  }

  return (
    <div className="w-80 bg-[#FDFCFA] font-sans text-[#1F2421]">
      <ShimmerStyles />

      <div className="relative px-5 py-4 border-b border-[#E7E1D7] bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-base font-semibold flex items-center gap-2 text-[#1F2421]">
              Draft AI
              {syncing && (
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#C4612F] animate-pulse"
                  aria-hidden="true"
                  title="Syncing"
                />
              )}
            </h1>
            <p className="text-xs text-[#5C635D] mt-0.5">AI outreach assistant</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked)
                chrome.storage.local.set({ enabled: e.target.checked })
              }}
              className="sr-only peer"
              disabled={!auth}
            />
            <div className="w-10 h-5 bg-[#E7E1D7] rounded-full peer peer-checked:bg-[#C4612F] peer-disabled:opacity-40 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-sm peer-checked:after:translate-x-5" />
          </label>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {auth ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#E7E1D7] bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium text-[#5C635D] mb-1 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#2D7A4F]" />
                Connected
              </p>
              <p className="text-sm font-medium truncate text-[#1F2421]">{auth.userEmail}</p>
            </div>

            {analyticsLoading ? (
              <div className="grid grid-cols-2 gap-3">
                <SkeletonBar className="h-24 w-full rounded-lg" />
                <SkeletonBar className="h-24 w-full rounded-lg" />
                <SkeletonBar className="h-24 w-full rounded-lg" />
                <SkeletonBar className="h-24 w-full rounded-lg" />
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Send className="h-4 w-4" />}
                  label="Sent today"
                  value={analytics.sentToday}
                  accent
                />
                <StatCard
                  icon={<FileText className="h-4 w-4" />}
                  label="Drafts today"
                  value={analytics.draftsToday}
                />
                <StatCard
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="This week"
                  value={analytics.sentThisWeek}
                />
                <StatCard
                  icon={<Check className="h-4 w-4" />}
                  label="Total sent"
                  value={analytics.totalSent}
                />
              </div>
            ) : null}

            <div className="rounded-lg bg-[#F2E3D6] px-4 py-3 border border-[#E7E1D7]">
              <p className="text-xs text-[#5C635D] leading-relaxed">
                Click <span className="font-semibold text-[#C4612F]">Draft</span> on any X or LinkedIn post to start.
              </p>
            </div>

            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-[#E7E1D7] hover:bg-[#FDFCFA] text-[#5C635D] hover:text-[#1F2421] rounded-lg text-sm font-medium transition-all"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#5C635D] leading-relaxed">
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
          </div>
        )}

        {statusMessage && (
          <p className="text-xs text-center text-[#C4612F] font-medium">{statusMessage}</p>
        )}

        <a
          href={WEB_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-xs text-[#5C635D] hover:text-[#C4612F] transition-colors pt-1"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open dashboard
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton — same footprint as the real layout, so nothing shifts when the
// background script responds. Only shown on a genuine cold start (first
// install, or after the cache has been cleared) — repeat opens skip it.
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-lg px-3 py-3 border ${
        accent
          ? "bg-[#F2E3D6] border-[#C4612F]/20"
          : "bg-white border-[#E7E1D7]"
      }`}
    >
      <div className={`flex items-center gap-1.5 mb-1.5 ${accent ? "text-[#C4612F]" : "text-[#5C635D]"}`}>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-[#1F2421] mb-0.5">{value}</p>
      <p className="text-xs text-[#5C635D]">{label}</p>
    </div>
  )
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded ${className}`} />
}

function PopupSkeleton() {
  return (
    <div className="w-80 bg-[#FDFCFA] font-sans">
      <ShimmerStyles />
      <div className="px-5 py-4 border-b border-[#E7E1D7] bg-white">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <SkeletonBar className="h-4 w-20" />
            <SkeletonBar className="h-3 w-28" />
          </div>
          <SkeletonBar className="h-5 w-10 !rounded-full" />
        </div>
      </div>
      <div className="p-5 space-y-4">
        <SkeletonBar className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBar className="h-20 w-full rounded-lg" />
          <SkeletonBar className="h-20 w-full rounded-lg" />
          <SkeletonBar className="h-20 w-full rounded-lg" />
          <SkeletonBar className="h-20 w-full rounded-lg" />
        </div>
        <SkeletonBar className="h-14 w-full rounded-lg" />
        <div className="flex justify-center pt-1">
          <SkeletonBar className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

function ShimmerStyles() {
  return (
    <style>{`
      .skeleton-shimmer {
        background: linear-gradient(90deg, #E7E1D7 25%, #F2E3D6 37%, #E7E1D7 63%);
        background-size: 400% 100%;
        animation: skeleton-shimmer 1.4s ease infinite;
      }
      @keyframes skeleton-shimmer {
        0% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .skeleton-shimmer { animation: none; background: #E7E1D7; }
      }

      .btn-primary {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        border-radius: 0.5rem;
        background: #C4612F;
        color: #FFFFFF;
        font-size: 0.875rem;
        font-weight: 600;
        transition: background 0.15s ease;
      }

      .btn-primary:hover:not(:disabled) {
        background: #A94E22;
      }

      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `}</style>
  )
}

export default IndexPopup