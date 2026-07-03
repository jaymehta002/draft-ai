import { useState, useEffect } from "react"
import { ExternalLink, LogOut, Loader2, Check } from "lucide-react"
import "./style.css"
import { WEB_URL } from "~lib/config"
import type { AuthState } from "~lib/config"

function IndexPopup() {
  const [enabled, setEnabled] = useState(true)
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const refreshAuth = () => {
    chrome.runtime.sendMessage({ type: "GET_AUTH" }, (response) => {
      setLoading(false)
      if (response?.success && response.auth) {
        setAuth(response.auth)
      } else {
        setAuth(null)
      }
    })
  }

  useEffect(() => {
    chrome.storage.local.get(["enabled"]).then((result) => {
      if (result.enabled !== undefined) setEnabled(result.enabled)
    })
    refreshAuth()

    const onStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== "local") return
      if (changes.apiKey || changes.userEmail) {
        refreshAuth()
        setConnecting(false)
        setStatusMessage("Connected")
        setTimeout(() => setStatusMessage(null), 3000)
      }
    }

    chrome.storage.onChanged.addListener(onStorageChange)
    return () => chrome.storage.onChanged.removeListener(onStorageChange)
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
      setStatusMessage("Disconnected")
      setTimeout(() => setStatusMessage(null), 3000)
    })
  }

  if (loading) {
    return (
      <div className="w-72 p-6 bg-white flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#737373]" />
        <span className="text-sm text-[#737373]">Loading…</span>
      </div>
    )
  }

  return (
    <div className="w-72 bg-white font-sans text-[#171717]">
      <div className="px-4 py-3 border-b border-[#e5e5e5] flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold">Draft AI</h1>
          <p className="text-[11px] text-[#737373]">Outreach assistant</p>
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
          <div className="w-9 h-5 bg-[#e5e5e5] rounded-full peer peer-checked:bg-[#2563eb] peer-disabled:opacity-40 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="p-4 space-y-3">
        {auth ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[#e5e5e5] bg-[#fafafa] px-3 py-2.5">
              <p className="text-[11px] font-medium text-[#737373] mb-0.5 flex items-center gap-1">
                <Check className="h-3 w-3 text-[#16a34a]" />
                Signed in
              </p>
              <p className="text-sm truncate">{auth.userEmail}</p>
            </div>
            <p className="text-sm text-[#525252] leading-relaxed">
              Click <span className="font-medium text-[#171717]">Draft</span> on any X or LinkedIn post.
            </p>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-[#e5e5e5] hover:bg-[#fafafa] text-[#525252] rounded-md text-sm transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[#525252] leading-relaxed">
              Sign in to draft outreach on X and LinkedIn.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="btn-primary"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Waiting…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        )}

        {statusMessage && (
          <p className="text-xs text-center text-[#2563eb] font-medium">{statusMessage}</p>
        )}

        <a
          href={WEB_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-[#737373] hover:text-[#171717] transition-colors pt-1"
        >
          <ExternalLink className="h-3 w-3" />
          Dashboard
        </a>
      </div>
    </div>
  )
}

export default IndexPopup
