"use client"

import { useMemo, useState, useTransition } from "react"
import {
  ExternalLink,
  Search,
  Mail,
  Check,
  Clock,
  User,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PostLink } from "@/components/post-link"
import { filterBySearch, sortByField } from "@/lib/panel-filters"
import { EMAIL_STATE_LABELS, type EmailLifecycleState } from "@/lib/outreach-state"
import { markEmailResponded, markThreadRead, syncMailbox } from "@/app/actions"
import { cn } from "@/lib/utils"
import type { getEmailsData } from "@/app/actions"

type EmailItem = Awaited<ReturnType<typeof getEmailsData>>["emails"][number]
type ThreadMessage = EmailItem["messages"][number]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

function getInitial(name?: string | null, email?: string | null) {
  return ((name || email || "?")[0] || "?").toUpperCase()
}

const STATE_BADGE_VARIANT: Record<EmailLifecycleState, React.ComponentProps<typeof Badge>["variant"]> = {
  SENT: "secondary",
  AGED: "warning",
  RESPONDED: "success",
}

function StateBadge({ state }: { state: EmailLifecycleState | null }) {
  if (!state) return null
  return <Badge variant={STATE_BADGE_VARIANT[state]}>{EMAIL_STATE_LABELS[state]}</Badge>
}

function EmptyList({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Mail className="size-5" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {filtered ? "No matching emails" : "No emails yet"}
        </p>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          {filtered
            ? "Try a different search or filter"
            : "Emails sent via the extension will appear here automatically."}
        </p>
      </div>
    </div>
  )
}

function ThreadListItem({
  email,
  isSelected,
  onClick,
}: {
  email: EmailItem
  isSelected: boolean
  onClick: () => void
}) {
  const initial = getInitial(email.recipientName, email.recipientEmail)
  const hasUnread = !email.threadIsRead
  const replyCount = email.threadMessageCount - 1 // exclude the outbound

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left px-3 py-3 transition-[background-color] duration-150 border-b border-border/50 last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread dot + avatar */}
        <div className="relative flex shrink-0 items-center justify-center">
          {hasUnread && !isSelected && (
            <span className="absolute -left-1 top-0 size-1.5 rounded-full bg-primary" />
          )}
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors",
              isSelected
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
            )}
          >
            {initial}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-xs",
                hasUnread ? "font-bold" : "font-medium",
                isSelected ? "text-accent-foreground" : "text-foreground"
              )}
            >
              {email.recipientName || email.recipientEmail || "Unknown"}
            </p>
            <span
              className={cn(
                "shrink-0 text-[10px] tabular-nums",
                isSelected ? "text-accent-foreground/70" : "text-muted-foreground"
              )}
            >
              {formatRelative(email.sentAt)}
            </span>
          </div>

          {email.subject && (
            <p
              className={cn(
                "mt-0.5 truncate text-[11px]",
                isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
              )}
            >
              {email.subject}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <StateBadge state={email.lifecycleState} />
            {replyCount > 0 && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-medium",
                isSelected ? "text-accent-foreground/70" : "text-muted-foreground"
              )}>
                <ArrowDownLeft className="size-2.5" />
                {replyCount} repl{replyCount === 1 ? "y" : "ies"}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ message }: { message: ThreadMessage }) {
  const isOutbound = message.direction === "OUTBOUND"
  const body = message.rawBody || message.snippet || ""

  return (
    <div className={cn("flex flex-col gap-1", isOutbound ? "items-start" : "items-end")}>
      {/* Direction label */}
      <div className={cn("flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground", isOutbound ? "flex-row" : "flex-row-reverse")}>
        {isOutbound
          ? <ArrowUpRight className="size-3 text-primary" />
          : <ArrowDownLeft className="size-3 text-chart-2" />}
        <span>{isOutbound ? "You" : "Them"}</span>
        <span className="opacity-60 font-normal normal-case tracking-normal ml-1">
          · {formatDate(message.receivedAt)}
        </span>
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[85%] rounded-xl p-4",
          isOutbound
            ? "rounded-tl-sm bg-primary text-primary-foreground"
            : "rounded-tr-sm bg-muted text-foreground border border-border"
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{body}</p>
      </div>
    </div>
  )
}

function EmailDetailView({
  email,
  onMarkResponded,
  marking,
}: {
  email: EmailItem
  onMarkResponded: () => void
  marking: boolean
}) {
  // Merge: if messages array is populated use it; otherwise fall back to the
  // legacy `message` field so existing pre-migration rows still render.
  const threadMessages: ThreadMessage[] =
    email.messages.length > 0
      ? email.messages
      : [
          {
            id: email.id + "-legacy",
            direction: "OUTBOUND",
            fromAddress: "",
            subject: email.subject,
            snippet: email.message,
            rawBody: email.message,
            isRead: true,
            receivedAt: email.sentAt,
          },
        ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-3 p-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">
                {email.recipientName || email.recipientEmail || "Unknown"}
              </h3>
              <StateBadge state={email.lifecycleState} />
              {!email.threadIsRead && (
                <Badge variant="secondary" className="text-[10px]">Unread reply</Badge>
              )}
            </div>
            {email.recipientEmail && (
              <p className="mt-0.5 text-xs text-muted-foreground">{email.recipientEmail}</p>
            )}
          </div>

          {email.lifecycleState !== "RESPONDED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={marking}
              onClick={onMarkResponded}
              className="shrink-0 gap-1.5"
            >
              <Check className="size-3.5" />
              Mark responded
            </Button>
          )}
        </div>

        {email.subject && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Subject</p>
            <p className="text-sm font-medium text-foreground">{email.subject}</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Sent {formatDate(email.sentAt)}
          </span>
          {email.responseReceivedAt && (
            <span className="flex items-center gap-1 text-chart-2">
              <Check className="size-3" />
              Replied {formatDate(email.responseReceivedAt)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Mail className="size-3" />
            {threadMessages.length} message{threadMessages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Full conversation thread */}
          {threadMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          <Separator />

          {/* Post context */}
          {email.postText && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Triggered by post
              </p>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{email.postText}</p>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            {email.postUrl && <PostLink url={email.postUrl} label="View post" />}
            {email.recipientProfileUrl && (
              <a
                href={email.recipientProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <User className="size-3" />
                View profile
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

function NoSelection() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Mail className="size-5" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-muted-foreground">Select a thread to read</p>
    </div>
  )
}

type EmailsPanelProps = {
  emails: EmailItem[]
  onRefresh?: () => void
}

export function EmailsPanel({ emails, onRefresh }: EmailsPanelProps) {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<"all" | EmailLifecycleState>("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [isSyncing, startSync] = useTransition()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const stats = useMemo(
    () => ({
      all: emails.length,
      SENT: emails.filter((e) => e.lifecycleState === "SENT").length,
      AGED: emails.filter((e) => e.lifecycleState === "AGED").length,
      RESPONDED: emails.filter((e) => e.lifecycleState === "RESPONDED").length,
      unread: emails.filter((e) => !e.threadIsRead).length,
    }),
    [emails]
  )

  const filtered = useMemo(() => {
    let items = emails
    if (stateFilter !== "all") {
      items = items.filter((e) => e.lifecycleState === stateFilter)
    }
    items = filterBySearch(items, search)
    return sortByField(items, "sentAt", "desc")
  }, [emails, search, stateFilter])

  const selectedEmail = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null

  const handleSelectThread = async (email: EmailItem) => {
    setSelectedId(email.id)
    // Mark thread read if it has unread messages
    if (!email.threadIsRead) {
      try {
        await markThreadRead(email.id)
        onRefresh?.()
      } catch {
        // Non-critical
      }
    }
  }

  const handleMarkResponded = async () => {
    if (!selectedEmail) return
    setMarkingId(selectedEmail.id)
    try {
      await markEmailResponded(selectedEmail.id)
      onRefresh?.()
    } finally {
      setMarkingId(null)
    }
  }

  const handleSync = () => {
    setSyncMessage(null)
    startSync(async () => {
      try {
        const result = await syncMailbox()
        setSyncMessage(
          result.newMessages > 0
            ? `${result.newMessages} new message${result.newMessages !== 1 ? "s" : ""} synced`
            : "Inbox up to date"
        )
        onRefresh?.()
      } catch (err) {
        setSyncMessage(err instanceof Error ? err.message : "Sync failed")
      }
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden shadow-sm bg-card">
      {/* Left — Thread list */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
        {/* Search + filters */}
        <div className="border-b border-border p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search inbox..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30 border-border/60"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={handleSync}
              disabled={isSyncing}
              title="Sync inbox"
            >
              <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
            </Button>
          </div>

          {syncMessage && (
            <p className="text-[10px] text-muted-foreground px-1">{syncMessage}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStateFilter("all")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition-colors duration-150",
                stateFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              All <span className="opacity-70">{stats.all}</span>
            </button>
            {(["SENT", "AGED", "RESPONDED"] as EmailLifecycleState[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStateFilter(s)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition-colors duration-150",
                  stateFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {EMAIL_STATE_LABELS[s]} <span className="opacity-70">{stats[s]}</span>
              </button>
            ))}
            {stats.unread > 0 && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold bg-chart-2/15 text-chart-2">
                <span className="size-1.5 rounded-full bg-chart-2" />
                {stats.unread} unread
              </span>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <EmptyList filtered={search.length > 0 || stateFilter !== "all"} />
          ) : (
            <div>
              {filtered.map((email) => (
                <ThreadListItem
                  key={email.id}
                  email={email}
                  isSelected={email.id === selectedEmail?.id}
                  onClick={() => handleSelectThread(email)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right — Email detail */}
      <div className="flex flex-1 flex-col min-w-0 bg-background">
        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            onMarkResponded={handleMarkResponded}
            marking={markingId === selectedEmail.id}
          />
        ) : (
          <NoSelection />
        )}
      </div>
    </div>
  )
}
