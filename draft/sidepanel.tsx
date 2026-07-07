import { useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Mail, Copy, Loader2, Check, AlertCircle, Sparkles } from "lucide-react"
import "./style.css"
import { DraftAIBrand } from "~components/draft-ai-brand"
import {
  ACTIVE_POST_KEY,
  DRAFTS_BY_POST_KEY,
  getActiveDraft,
  setDraftForPost,
  type DraftPreview,
  type DraftVariantPreview,
} from "~lib/draft"
import { persistDraftEdits } from "~lib/draft-sync"
import { WEB_URL } from "~lib/config"
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

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Direct" },
  { value: "formal", label: "Formal" },
] as const

function SidePanel() {
  const [draft, setDraft] = useState<DraftPreview | null>(null)
  const [message, setMessage] = useState("")
  const [subject, setSubject] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle")
  const [copied, setCopied] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [statusNote, setStatusNote] = useState<StatusNote | null>(null)
  const [showWhyDraft, setShowWhyDraft] = useState(true)
  const [showConfidenceNudge, setShowConfidenceNudge] = useState(true)
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  const [generatingTone, setGeneratingTone] = useState<string | null>(null)
  const [originalMessage, setOriginalMessage] = useState("")
  const [originalSubject, setOriginalSubject] = useState("")
  const [toneRecommendation, setToneRecommendation] = useState<string | null>(null)
  const [recommendedTone, setRecommendedTone] = useState<string | null>(null)

  const dirtyRef = useRef(false)
  const postIdRef = useRef<string | undefined>(undefined)
  const selfPersistRef = useRef(false)
  const sendingRef = useRef(false)
  const copyingRef = useRef(false)

  const debouncedPersist = useDebouncedCallback((msg: string, subj: string, email: string) => {
    selfPersistRef.current = true
    persistDraftEdits(msg, subj, email, postIdRef.current).finally(() => {
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
      setActiveVariantId(current.variantId ?? null)
      setOriginalMessage(current.message ?? "")
      setOriginalSubject(current.subject ?? "")
      setMessage(current.message ?? "")
      setSubject(current.subject ?? "")
      setRecipientEmail(current.recipientEmail ?? current.emailPayload?.to ?? "")

      if (isNewPost) {
        setSubmissionState(current.status === "sent" ? "sent" : "idle")
        setCopied(false)
        setIsCopying(false)
        setStatusNote(
          current.status === "sent"
            ? { tone: "success", text: "Email delivered successfully." }
            : null
        )
      }
      return
    }

    if (!dirtyRef.current) {
      setMessage(current.message ?? "")
      setSubject(current.subject ?? "")
      setRecipientEmail(current.recipientEmail ?? current.emailPayload?.to ?? "")
    }
  }, [])

  useEffect(() => {
    getActiveDraft().then((current) => {
      if (current) {
        setDraft(current)
        syncFromStorage(current, true)
        setSubmissionState(current.status === "sent" ? "sent" : "idle")
      }
    })

    const onChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return
      if (selfPersistRef.current || sendingRef.current || copyingRef.current) return

      const activeChange = changes[ACTIVE_POST_KEY]
      const draftsChange = changes[DRAFTS_BY_POST_KEY]
      if (!activeChange && !draftsChange) return

      const activePostId =
        (activeChange?.newValue as string | undefined) ?? postIdRef.current
      if (!activePostId) return

      const draftsMap = draftsChange?.newValue as Record<string, DraftPreview> | undefined
      const current = draftsMap?.[activePostId]
      if (!current) return

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

  useEffect(() => {
    if (!draft || draft.status !== "ready") return

    chrome.storage.local.get(["apiKey"], async (result) => {
      const apiKey = result.apiKey as string | undefined
      if (!apiKey) return
      try {
        const res = await fetch(`${WEB_URL}/api/extension/insights`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.recommendation?.reason) {
          setToneRecommendation(data.recommendation.reason)
          setRecommendedTone(data.recommendation.tone)
        }
      } catch {
        // Non-fatal
      }
    })
  }, [draft?.status, draft?.postId])

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
    if (!draft?.emailPayload) {
      setStatusNote({ tone: "error", text: "Email send is unavailable for this draft." })
      return
    }
    const normalizedEmail = recipientEmail.trim()
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setStatusNote({ tone: "error", text: "Enter a valid recipient email before sending." })
      return
    }

    sendingRef.current = true
    setSubmissionState("sending")
    setStatusNote(null)

    selfPersistRef.current = true
    try {
      await persistDraftEdits(message, subject, normalizedEmail, draft.postId)
    } finally {
      setTimeout(() => {
        selfPersistRef.current = false
      }, 50)
    }

    const payload = {
      to: normalizedEmail,
      subject: subject || draft.emailPayload.subject,
      body: message,
      postId: draft.postId || draft.emailPayload.postId,
      postUrl: draft.postUrl || draft.emailPayload.postUrl,
      platform: draft.platform || draft.emailPayload.platform,
      draftId: draft.draftId || draft.emailPayload.draftId,
      variantId: activeVariantId ?? draft.variantId,
      recipientName: draft.recipientName || draft.emailPayload.recipientName,
      recipientHandle: draft.recipientHandle || draft.emailPayload.recipientHandle,
      recipientProfileUrl: draft.recipientProfileUrl || draft.emailPayload.recipientProfileUrl,
    }

    chrome.runtime.sendMessage({ type: "SEND_EMAIL", payload }, (response) => {
      sendingRef.current = false

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
        setStatusNote({ tone: "success", text: "Conversation started!" })
        dirtyRef.current = false
        if (draft.postId) {
          const sentDraft: DraftPreview = {
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
          }
          void setDraftForPost(draft.postId, sentDraft)
        }
      } else {
        setSubmissionState("idle")
        setStatusNote({ tone: "error", text: response?.error || "Failed to send email" })
      }
    })
  }

  const usedTones = new Set([
    draft?.activeTone || "professional",
    ...(draft?.variants?.map((v) => v.toneUsed) ?? []),
  ])

  const availableTones = TONE_OPTIONS.filter((t) => !usedTones.has(t.value))

  const selectVariant = (variant: DraftVariantPreview | null) => {
    if (!draft?.postId) return
    if (!variant) {
      setActiveVariantId(null)
      setMessage(originalMessage)
      setSubject(originalSubject)
      dirtyRef.current = false
      void setDraftForPost(draft.postId, {
        ...draft,
        variantId: undefined,
        activeTone: "professional",
        message: originalMessage,
        subject: originalSubject,
        updatedAt: Date.now(),
      })
      return
    }

    setActiveVariantId(variant.id)
    setMessage(variant.message)
    setSubject(variant.subject ?? "")
    dirtyRef.current = false
    void setDraftForPost(draft.postId, {
      ...draft,
      variantId: variant.id,
      activeTone: variant.toneUsed,
      message: variant.message,
      subject: variant.subject ?? "",
      matchInsight: variant.matchInsight ?? draft.matchInsight,
      updatedAt: Date.now(),
    })
  }

  const handleTryAnotherTone = (tone: string) => {
    if (!draft?.postId || generatingTone) return
    setGeneratingTone(tone)

    chrome.runtime.sendMessage(
      { type: "GENERATE_VARIANT", payload: { postId: draft.postId, alternateTone: tone } },
      (response) => {
        setGeneratingTone(null)
        if (chrome.runtime.lastError || !response?.success) {
          setStatusNote({
            tone: "error",
            text: response?.error || chrome.runtime.lastError?.message || "Failed to generate variant",
          })
          return
        }

        const variant = response.variant as DraftVariantPreview
        const variants = [...(draft.variants ?? []), variant]
        const updated: DraftPreview = {
          ...draft,
          variants,
          updatedAt: Date.now(),
        }
        void setDraftForPost(draft.postId, updated)
        setDraft(updated)
        selectVariant(variant)
      }
    )
  }

  const handleCopy = async () => {
    if (isCopying || !message.trim()) return

    copyingRef.current = true
    setIsCopying(true)

    try {
      await navigator.clipboard.writeText(message)

      selfPersistRef.current = true
      try {
        await persistDraftEdits(message, subject, recipientEmail, draft?.postId)
      } finally {
        setTimeout(() => {
          selfPersistRef.current = false
        }, 50)
      }

      if (draft?.postId) {
        chrome.runtime.sendMessage({
          type: "RECORD_OUTREACH",
          payload: {
            postId: draft.postId,
            postUrl: draft.postUrl,
            platform: draft.platform,
            draftId: draft.draftId,
            variantId: activeVariantId ?? draft.variantId,
            recipientName: draft.recipientName,
            recipientHandle: draft.recipientHandle,
            recipientProfileUrl: draft.recipientProfileUrl,
            message,
            actionMode: "DM",
          },
        })
      }

      setCopied(true)
      setStatusNote({ tone: "success", text: "Conversation started! Paste into their DMs." })
      setTimeout(() => setCopied(false), 2000)
    } finally {
      copyingRef.current = false
      setIsCopying(false)
    }
  }

  const isLoading = draft?.status === "loading"
  const isReady = draft?.status === "ready" || draft?.status === "sent"
  const isEmail = draft?.actionMode === "EMAIL"
  const isSent = draft?.status === "sent" || submissionState === "sent"
  const isSending = submissionState === "sending"
  const emailIsValid = !isEmail || !recipientEmail.trim() || isValidEmail(recipientEmail)
  const canSendEmail = Boolean(message.trim() && recipientEmail.trim() && isValidEmail(recipientEmail))

  return (
    <div className="relative min-h-screen bg-background font-sans text-foreground">
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-border bg-background px-6 py-4">
          <DraftAIBrand subtitle="Outreach Studio" />
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
                <div className="rounded-xl border border-border bg-primary/10 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Drafting for <span className="font-semibold text-primary">{draft.recipientName}</span>
                  </p>
                </div>
              )}

              {draft.matchInsight && (
                <div className="rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setShowWhyDraft((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground"
                  >
                    Why this draft
                    <span className="text-xs text-muted-foreground">
                      {draft.matchInsight.score}% match
                    </span>
                  </button>
                  {showWhyDraft && (
                    <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground space-y-2">
                      {draft.matchInsight.reason && <p>{draft.matchInsight.reason}</p>}
                      {draft.matchInsight.highlights?.map((h) => (
                        <p key={h} className="text-primary">· {h}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(draft.variants?.length ?? 0) > 0 || availableTones.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    Tone variants
                  </p>
                  {toneRecommendation && (
                    <p className="text-[10px] text-primary rounded-md bg-primary/5 px-2 py-1.5">
                      {toneRecommendation}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => selectVariant(null)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                        !activeVariantId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      )}
                    >
                      Original
                    </button>
                    {draft.variants?.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectVariant(v)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize transition-colors",
                          activeVariantId === v.id
                            ? "bg-primary text-primary-foreground"
                            : recommendedTone === v.toneUsed
                              ? "ring-2 ring-primary/40 bg-muted text-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {v.toneUsed}
                      </button>
                    ))}
                  </div>
                  {availableTones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {availableTones.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          disabled={Boolean(generatingTone)}
                          onClick={() => handleTryAnotherTone(t.value)}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          {generatingTone === t.value ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          Try {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {showConfidenceNudge && message.trim() && !isSent && (
                <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-2">
                  Read aloud — does this sound like you?
                  <button
                    type="button"
                    onClick={() => setShowConfidenceNudge(false)}
                    className="text-primary hover:underline shrink-0"
                  >
                    Dismiss
                  </button>
                </p>
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
          <footer className="border-t border-border bg-background px-6 py-4 shadow-lg">
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
                  <motion.span
                    className="inline-flex items-center gap-2"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  >
                    <Check className="h-4 w-4" />
                    Sent
                  </motion.span>
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
                disabled={isCopying || !message.trim()}
                className={cn("btn-secondary", (isCopying || !message.trim()) && "btn-disabled")}
              >
                {isCopying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Copying
                  </>
                ) : copied ? (
                  <motion.span
                    className="inline-flex items-center gap-2"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                  >
                    <Check className="h-4 w-4" />
                    Copied
                  </motion.span>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy message
                  </>
                )}
              </button>
            )}
          </footer>
        )}
      </div>
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          No draft in progress
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Click <span className="font-semibold text-primary">Draft</span> on any post to open the studio.
        </p>
      </div>
    </div>
  )
}

function LoadingState({ recipientName }: { recipientName: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-primary/10 px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
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
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Couldn&apos;t build the draft
        </h2>
        <p className="text-sm leading-relaxed text-destructive">{message}</p>
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
  return <div className={cn("panel-shimmer", className)} />
}

export default SidePanel
