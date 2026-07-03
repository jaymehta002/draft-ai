import { useEffect, useRef, useState, useCallback } from "react"
import { Mail, Copy, Loader2, Check, AlertCircle } from "lucide-react"
import "./style.css"
import { DRAFT_STORAGE_KEY, type DraftPreview } from "~lib/draft"
import { persistDraftEdits } from "~lib/draft-sync"
import { cn } from "~lib/utils"

function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
) {
  const fnRef = useRef(fn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fnRef.current = fn
  }, [fn])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => fnRef.current(...args), delay)
    },
    [delay]
  )
}

function SidePanel() {
  const [draft, setDraft] = useState<DraftPreview | null>(null)
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [statusNote, setStatusNote] = useState<string | null>(null)

  const dirtyRef = useRef(false)
  const postIdRef = useRef<string | undefined>(undefined)
  const selfPersistRef = useRef(false)

  const debouncedPersist = useDebouncedCallback((msg: string, subj: string) => {
    selfPersistRef.current = true
    persistDraftEdits(msg, subj).finally(() => {
      setTimeout(() => {
        selfPersistRef.current = false
      }, 50)
    })
  }, 400)

  const syncFromStorage = useCallback((current: DraftPreview, force = false) => {
    const isNewPost = current.postId !== postIdRef.current
    const isLoading = current.status === "loading"

    if (isNewPost || isLoading || force) {
      postIdRef.current = current.postId
      dirtyRef.current = false
      setMessage(current.message ?? "")
      setSubject(current.subject ?? "")
      return
    }

    if (!dirtyRef.current) {
      setMessage(current.message ?? "")
      setSubject(current.subject ?? "")
    }
  }, [])

  useEffect(() => {
    chrome.storage.local.get(DRAFT_STORAGE_KEY).then((result) => {
      const current = result[DRAFT_STORAGE_KEY] as DraftPreview | undefined
      if (current) {
        setDraft(current)
        syncFromStorage(current, true)
      }
    })

    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local" || !changes[DRAFT_STORAGE_KEY]) return
      if (selfPersistRef.current) return

      const current = changes[DRAFT_STORAGE_KEY].newValue as DraftPreview
      setDraft(current)
      syncFromStorage(current)
      setSending(false)
      setCopied(false)
      setStatusNote(null)
    }

    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [syncFromStorage])

  const handleMessageChange = (value: string) => {
    dirtyRef.current = true
    setMessage(value)
    debouncedPersist(value, subject)
  }

  const handleSubjectChange = (value: string) => {
    dirtyRef.current = true
    setSubject(value)
    debouncedPersist(message, value)
  }

  const handleSend = async () => {
    if (!draft?.emailPayload) return
    setSending(true)
    setStatusNote(null)

    await persistDraftEdits(message, subject)

    const payload = {
      to: draft.emailPayload.to,
      subject: subject || draft.emailPayload.subject,
      body: message,
      postId: draft.postId || draft.emailPayload.postId,
      postUrl: draft.postUrl || draft.emailPayload.postUrl,
      platform: draft.platform || draft.emailPayload.platform,
      draftId: draft.draftId || draft.emailPayload.draftId,
      recipientName: draft.recipientName || draft.emailPayload.recipientName,
      recipientHandle: draft.recipientHandle || draft.emailPayload.recipientHandle,
      recipientProfileUrl: draft.recipientProfileUrl || draft.emailPayload.recipientProfileUrl,
    }

    chrome.runtime.sendMessage({ type: "SEND_EMAIL", payload }, (response) => {
      setSending(false)
      if (response?.success) {
        setStatusNote("Email sent")
        dirtyRef.current = false
        chrome.storage.local.set({
          [DRAFT_STORAGE_KEY]: {
            ...draft,
            status: "sent",
            message,
            subject,
            updatedAt: Date.now(),
          },
        })
      } else {
        setStatusNote(response?.error || "Failed to send")
      }
    })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    await persistDraftEdits(message, subject)

    if (draft?.postId) {
      chrome.runtime.sendMessage({
        type: "RECORD_OUTREACH",
        payload: {
          postId: draft.postId,
          postUrl: draft.postUrl,
          platform: draft.platform,
          draftId: draft.draftId,
          recipientName: draft.recipientName,
          recipientHandle: draft.recipientHandle,
          recipientProfileUrl: draft.recipientProfileUrl,
          message,
          actionMode: "DM",
        },
      })
    }
    setCopied(true)
    setStatusNote("Copied — paste in their DMs")
    setTimeout(() => setCopied(false), 2000)
  }

  const isLoading = draft?.status === "loading"
  const isReady = draft?.status === "ready" || draft?.status === "sent"
  const isEmail = draft?.actionMode === "EMAIL"
  const isSent = draft?.status === "sent"

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717] font-sans flex flex-col">
      <header className="px-4 py-3 border-b border-[#e5e5e5] bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold leading-tight">Draft</h1>
            <p className="text-xs text-[#737373] truncate mt-0.5">
              {draft?.recipientName || "Select a post to draft"}
            </p>
          </div>
          {draft?.actionMode && (
            <span
              className={cn(
                "shrink-0 text-[11px] font-medium px-2 py-0.5 rounded",
                isEmail ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-[#f5f5f5] text-[#525252]"
              )}
            >
              {isEmail ? "Email" : "DM"}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {!draft || draft.status === "idle" ? (
          <EmptyState />
        ) : isLoading ? (
          <LoadingState recipientName={draft.recipientName} />
        ) : draft.status === "error" ? (
          <ErrorState message={draft.error || "Something went wrong"} />
        ) : isReady ? (
          <div className="space-y-4">
            {isEmail && draft.recipientEmail && (
              <Field label="To">
                <p className="text-sm text-[#171717]">{draft.recipientEmail}</p>
              </Field>
            )}
            {isEmail && (
              <Field label="Subject">
                <input
                  value={subject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  disabled={isSent}
                  className="field-input"
                />
              </Field>
            )}
            <Field label="Message">
              <textarea
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                disabled={isSent}
                rows={16}
                className="field-input min-h-[280px] resize-y leading-relaxed"
              />
            </Field>
            {statusNote && (
              <p
                className={cn(
                  "text-sm px-3 py-2 rounded border",
                  isSent || copied
                    ? "bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]"
                    : "bg-[#fef2f2] text-[#991b1b] border-[#fecaca]"
                )}
              >
                {statusNote}
              </p>
            )}
          </div>
        ) : null}
      </main>

      {isReady && !isSent && (
        <footer className="p-4 border-t border-[#e5e5e5] bg-white">
          {isEmail ? (
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="btn-primary"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send email
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCopy}
              disabled={!message.trim()}
              className="btn-primary bg-[#171717] hover:bg-[#262626]"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy message"}
            </button>
          )}
        </footer>
      )}

      {isSent && (
        <footer className="p-4 border-t border-[#e5e5e5] bg-[#f0fdf4]">
          <p className="text-sm text-center text-[#166534] font-medium flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" />
            Sent
          </p>
        </footer>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#737373] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-20 px-4">
      <p className="text-sm text-[#525252] max-w-[220px] leading-relaxed">
        Click <span className="font-medium text-[#171717]">Draft</span> on a post to generate a message here.
      </p>
    </div>
  )
}

function LoadingState({ recipientName }: { recipientName: string }) {
  return (
    <div className="py-16 flex flex-col items-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-[#737373]" />
      <p className="text-sm text-[#737373]">
        Writing{recipientName ? ` for ${recipientName}` : ""}…
      </p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded border border-[#fecaca] bg-[#fef2f2] p-4 text-center">
      <AlertCircle className="h-5 w-5 text-[#dc2626] mx-auto mb-2" />
      <p className="text-sm font-medium text-[#991b1b]">Couldn&apos;t generate draft</p>
      <p className="text-sm text-[#b91c1c] mt-1">{message}</p>
    </div>
  )
}

export default SidePanel
