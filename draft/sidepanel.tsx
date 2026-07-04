import { useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
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

type SubmissionState = "idle" | "sending" | "sent"
type StatusTone = "success" | "error" | "info"
type StatusNote = { tone: StatusTone; text: string }

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function SidePanel() {
  const [draft, setDraft] = useState<DraftPreview | null>(null)
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle")
  const [copied, setCopied] = useState(false)
  const [statusNote, setStatusNote] = useState<StatusNote | null>(null)

  const dirtyRef = useRef(false)
  const postIdRef = useRef<string | undefined>(undefined)
  const selfPersistRef = useRef(false)

  const debouncedPersist = useDebouncedCallback((msg: string, subj: string, email: string) => {
    selfPersistRef.current = true
    persistDraftEdits(msg, subj, email).finally(() => {
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
      setRecipientEmail(current.recipientEmail ?? current.emailPayload?.to ?? "")
      return
    }

    if (!dirtyRef.current) {
      setMessage(current.message ?? "")
      setSubject(current.subject ?? "")
      setRecipientEmail(current.recipientEmail ?? current.emailPayload?.to ?? "")
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
      setCopied(false)
      setSubmissionState(current.status === "sent" ? "sent" : "idle")
      setStatusNote(
        current.status === "sent"
          ? { tone: "success", text: "Email delivered successfully." }
          : null
      )
    }

    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [syncFromStorage])

  const handleMessageChange = (value: string) => {
    dirtyRef.current = true
    setMessage(value)
    debouncedPersist(value, subject, recipientEmail)
  }

  const handleSubjectChange = (value: string) => {
    dirtyRef.current = true
    setSubject(value)
    debouncedPersist(message, value, recipientEmail)
  }

  const handleEmailChange = (value: string) => {
    dirtyRef.current = true
    setRecipientEmail(value)
    debouncedPersist(message, subject, value)
  }

  const handleSend = async () => {
    if (!draft?.emailPayload) return
    const normalizedEmail = recipientEmail.trim()
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setStatusNote({ tone: "error", text: "Enter a valid recipient email before sending." })
      return
    }

    setSubmissionState("sending")
    setStatusNote(null)

    await persistDraftEdits(message, subject, normalizedEmail)

    const payload = {
      to: normalizedEmail,
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
      if (chrome.runtime.lastError) {
        setSubmissionState("idle")
        setStatusNote({
          tone: "error",
          text: chrome.runtime.lastError.message || "Failed to send email",
        })
        return
      }

      if (response?.success) {
        setSubmissionState("sent")
        setStatusNote({ tone: "success", text: "Email delivered successfully." })
        dirtyRef.current = false
        chrome.storage.local.set({
          [DRAFT_STORAGE_KEY]: {
            ...draft,
            status: "sent",
            message,
            subject,
            recipientEmail: normalizedEmail,
            emailPayload: draft.emailPayload
              ? {
                  ...draft.emailPayload,
                  to: normalizedEmail,
                  subject: subject || draft.emailPayload.subject,
                  body: message,
                }
              : undefined,
            updatedAt: Date.now(),
          },
        })
      } else {
        setSubmissionState("idle")
        setStatusNote({ tone: "error", text: response?.error || "Failed to send email" })
      }
    })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    await persistDraftEdits(message, subject, recipientEmail)

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
    setStatusNote({ tone: "info", text: "Copied. Paste it directly into their DMs." })
    setTimeout(() => setCopied(false), 2000)
  }

  const isLoading = draft?.status === "loading"
  const isReady = draft?.status === "ready" || draft?.status === "sent"
  const isEmail = draft?.actionMode === "EMAIL"
  const isSent = draft?.status === "sent" || submissionState === "sent"
  const isSending = submissionState === "sending"
  const emailIsValid = !isEmail || !recipientEmail.trim() || isValidEmail(recipientEmail)
  const canSendEmail = Boolean(message.trim() && recipientEmail.trim() && isValidEmail(recipientEmail))

  return (
    <div className="relative min-h-screen bg-[#FDFCFA] text-[#1F2421]">
      <PanelStyles />

      <div className="flex min-h-screen flex-col">
        <header className="border-b border-[#E7E1D7] bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-[#1F2421]">Draft Studio</h1>
          <p className="text-sm text-[#5C635D] mt-0.5">Craft personalized outreach</p>
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-28 pt-6">
          {!draft || draft.status === "idle" ? (
            <EmptyState />
          ) : isLoading ? (
            <LoadingState recipientName={draft.recipientName} />
          ) : draft.status === "error" ? (
            <ErrorState message={draft.error || "Something went wrong"} />
          ) : isReady ? (
            <div className="space-y-6">
              {draft.recipientName && (
                <div className="rounded-lg bg-[#F2E3D6] px-4 py-3 border border-[#E7E1D7]">
                  <p className="text-sm text-[#5C635D]">
                    Drafting for <span className="font-semibold text-[#C4612F]">{draft.recipientName}</span>
                  </p>
                </div>
              )}

              {isEmail && (
                <Field label="Recipient" hint={!emailIsValid && recipientEmail.trim() ? "Enter a valid email address." : undefined} hintTone="error">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    disabled={isSent || isSending}
                    placeholder="name@example.com"
                    className={cn(
                      "field-input",
                      !emailIsValid && recipientEmail.trim() && "field-input--error"
                    )}
                  />
                </Field>
              )}

              {isEmail && (
                <Field label="Subject">
                  <input
                    value={subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    disabled={isSent || isSending}
                    placeholder="Subject line"
                    className="field-input"
                  />
                </Field>
              )}

              <Field label="Message">
                <textarea
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                  disabled={isSent || isSending}
                  rows={16}
                  placeholder="Write your message..."
                  className="field-input field-textarea"
                />
              </Field>

              <AnimatePresence mode="wait">
                {statusNote && (
                  <StatusBanner key={statusNote.text} tone={statusNote.tone}>
                    {statusNote.text}
                  </StatusBanner>
                )}
              </AnimatePresence>
            </div>
          ) : null}
        </main>

        {isReady && (
          <footer className="border-t border-[#E7E1D7] bg-white px-6 py-4 shadow-lg">
            {isEmail ? (
              <button
                onClick={handleSend}
                disabled={isSent || isSending || !canSendEmail}
                className={cn("btn-primary", (isSent || isSending || !canSendEmail) && "btn-disabled")}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : isSent ? (
                  <>
                    <Check className="h-4 w-4" />
                    Sent
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
                className={cn("btn-secondary", !message.trim() && "btn-disabled")}
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy message"}
              </button>
            )}
          </footer>
        )}
      </div>

      <AnimatePresence>
        {isSending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[#FDFCFA]/95 backdrop-blur-sm"
          >
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#C4612F]" />
              <p className="mt-3 text-sm text-[#5C635D]">Sending your email…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Field({
  label,
  hint,
  hintTone = "error",
  children,
}: {
  label: string
  hint?: string
  hintTone?: "error"
  children: ReactNode
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
      {hint && <p className={cn("field-hint", hintTone === "error" && "field-hint--error")}>{hint}</p>}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center text-center">
      <div className="max-w-[260px]">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#F2E3D6] flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-[#C4612F]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2421] mb-2">
          No draft in progress
        </h2>
        <p className="text-sm leading-relaxed text-[#5C635D]">
          Click <span className="font-semibold text-[#C4612F]">Draft</span> on any post to open the studio.
        </p>
      </div>
    </div>
  )
}

function LoadingState({ recipientName }: { recipientName: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-[#F2E3D6] px-4 py-3 border border-[#E7E1D7]">
        <p className="text-sm text-[#5C635D] flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-[#C4612F]" />
          Writing{recipientName ? ` for ${recipientName}` : ""}…
        </p>
      </div>

      <div className="space-y-5">
        <SkeletonLine className="h-11 w-full" />
        <SkeletonLine className="h-11 w-2/3" />
        <SkeletonLine className="h-64 w-full" />
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center text-center">
      <div className="max-w-[280px]">
        <div className="mx-auto h-12 w-12 rounded-full bg-[#FBEAE8] flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-[#A53D30]" />
        </div>
        <h2 className="text-xl font-semibold text-[#1F2421] mb-2">
          Couldn&apos;t build the draft
        </h2>
        <p className="text-sm leading-relaxed text-[#874235]">{message}</p>
      </div>
    </div>
  )
}

function StatusBanner({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn("status-banner", `status-banner--${tone}`)}
    >
      {children}
    </motion.div>
  )
}

function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn("panel-shimmer rounded-lg bg-[#E7E1D7]", className)} />
}

function PanelStyles() {
  return (
    <style>{`
      .field-label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #5C635D;
      }

      .field-input {
        width: 100%;
        border: 1px solid #E7E1D7;
        border-radius: 8px;
        background: #FFFFFF;
        padding: 10px 14px;
        font-size: 14px;
        line-height: 1.5;
        color: #1F2421;
        outline: none;
        transition: all 0.15s ease;
      }

      .field-input::placeholder {
        color: #9CA3A0;
      }

      .field-input:focus {
        border-color: #C4612F;
        box-shadow: 0 0 0 3px rgba(196, 97, 47, 0.1);
      }

      .field-input:disabled {
        color: #9CA3A0;
        background: #F7F4EF;
        border-color: #E7E1D7;
        cursor: not-allowed;
      }

      .field-input--error {
        border-color: #A53D30;
      }

      .field-input--error:focus {
        box-shadow: 0 0 0 3px rgba(165, 61, 48, 0.1);
      }

      .field-textarea {
        resize: vertical;
        min-height: 280px;
      }

      .field-hint {
        margin-top: 6px;
        font-size: 12px;
        color: #5C635D;
      }

      .field-hint--error {
        color: #A53D30;
      }

      .btn-primary {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 8px;
        background: #C4612F;
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 600;
        color: #FFFFFF;
        transition: background 0.15s ease;
        border: none;
        cursor: pointer;
      }

      .btn-primary:hover:not(.btn-disabled) {
        background: #A94E22;
      }

      .btn-secondary {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid #E7E1D7;
        border-radius: 8px;
        background: #FFFFFF;
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 600;
        color: #1F2421;
        transition: all 0.15s ease;
        cursor: pointer;
      }

      .btn-secondary:hover:not(.btn-disabled) {
        background: #F7F4EF;
        border-color: #C4612F;
      }

      .btn-disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      .status-banner {
        border-radius: 8px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.5;
      }

      .status-banner--success {
        background: #EAF5EF;
        color: #1F7A54;
        border: 1px solid #C3E6CD;
      }

      .status-banner--error {
        background: #FBEAE8;
        color: #A53D30;
        border: 1px solid #F5C6C0;
      }

      .status-banner--info {
        background: #EDF1FA;
        color: #3A5BA0;
        border: 1px solid #C8D5F0;
      }

      .panel-shimmer {
        position: relative;
        overflow: hidden;
      }

      .panel-shimmer::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, transparent, rgba(196, 97, 47, 0.08), transparent);
        animation: panel-shimmer 1.6s ease-in-out infinite;
      }

      @keyframes panel-shimmer {
        100% { transform: translateX(100%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .panel-shimmer::after {
          animation: none;
        }
      }
    `}</style>
  )
}

export default SidePanel