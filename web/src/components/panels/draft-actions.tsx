"use client"

import { useState } from "react"
import Link from "next/link"
import { Copy, Check, ExternalLink, Mail, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { sendDraftFromWeb, copyDmFromWeb } from "@/app/actions/conversation"

type WeeklyGoalCardProps = {
  weekProgress: number
  weeklyGoal: number
}

export function WeeklyGoalCard({ weekProgress, weeklyGoal }: WeeklyGoalCardProps) {
  const pct = weeklyGoal > 0 ? Math.min((weekProgress / weeklyGoal) * 100, 100) : 0

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        Weekly goal
      </p>
      <p className="text-2xl font-bold tabular-nums text-foreground">
        {weekProgress}
        <span className="text-base font-medium text-muted-foreground"> / {weeklyGoal}</span>
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">conversations started this week</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%`, transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
    </div>
  )
}

type DraftActionsProps = {
  draftId: string
  actionMode: string
  postUrl: string | null
  message: string
  gmailConnected?: boolean
}

export function DraftActions({
  draftId,
  actionMode,
  postUrl,
  message,
  gmailConnected,
}: DraftActionsProps) {
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    setSending(true)
    try {
      await sendDraftFromWeb(draftId)
      setSent(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to send")
    } finally {
      setSending(false)
    }
  }

  const handleCopyDm = async () => {
    setSending(true)
    try {
      await copyDmFromWeb(draftId)
      await navigator.clipboard.writeText(message)
      setSent(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <p className="text-xs font-medium text-primary flex items-center gap-1">
        <Check className="size-3.5" /> Conversation started!
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actionMode === "EMAIL" && gmailConnected && (
        <Button size="sm" onClick={handleSendEmail} disabled={sending}>
          <Mail className="size-3.5 mr-1" />
          {sending ? "Sending…" : "Send email"}
        </Button>
      )}
      {actionMode === "DM" && (
        <Button size="sm" onClick={handleCopyDm} disabled={sending}>
          <MessageCircle className="size-3.5 mr-1" />
          {sending ? "Saving…" : "Copy & mark sent"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={handleCopy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        Copy
      </Button>
      {postUrl && (
        <Button size="sm" variant="outline" asChild>
          <a href={postUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-3.5 mr-1" />
            Open post
          </a>
        </Button>
      )}
    </div>
  )
}
