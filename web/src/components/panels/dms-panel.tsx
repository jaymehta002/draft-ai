"use client"

import { useMemo, useState } from "react"
import {
  MessageCircle,
  Copy,
  Check,
  Clock,
  User,
  ExternalLink,
  Search,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { PostLink } from "@/components/post-link"
import { RecipientProfile } from "@/components/recipient-profile"
import { filterBySearch, sortByField } from "@/lib/panel-filters"
import { EMAIL_STATE_LABELS, type EmailLifecycleState } from "@/lib/outreach-state"
import { cn } from "@/lib/utils"
import type { getDMsData } from "@/app/actions"

type DMItem = Awaited<ReturnType<typeof getDMsData>>["dms"][number]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

function getInitial(name?: string | null) {
  return ((name || "?")[0] || "?").toUpperCase()
}

function EmptyList({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <MessageCircle className="size-5" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {filtered ? "No matching messages" : "No DMs yet"}
        </p>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          {filtered
            ? "Try a different search or filter"
            : "Copy DMs from the extension on X or LinkedIn — they'll appear here."}
        </p>
      </div>
    </div>
  )
}

const LIFECYCLE_VARIANT: Record<EmailLifecycleState, "default" | "secondary" | "outline"> = {
  SENT: "secondary",
  AGED: "outline",
  RESPONDED: "default",
}

function DMListItem({
  dm,
  isSelected,
  onClick,
}: {
  dm: DMItem
  isSelected: boolean
  onClick: () => void
}) {
  const initial = getInitial(dm.recipientName)

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
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
            isSelected
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}
        >
          {initial}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-xs font-semibold",
                isSelected ? "text-accent-foreground" : "text-foreground"
              )}
            >
              {dm.recipientName || "Unknown"}
            </p>
            <span
              className={cn(
                "shrink-0 text-[10px] tabular-nums",
                isSelected ? "text-accent-foreground/70" : "text-muted-foreground"
              )}
            >
              {formatRelative(dm.sentAt)}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              {dm.platform}
            </Badge>
            {dm.lifecycleState && (
              <Badge
                variant={LIFECYCLE_VARIANT[dm.lifecycleState]}
                className="text-[9px] px-1.5 py-0 h-4"
              >
                {EMAIL_STATE_LABELS[dm.lifecycleState]}
              </Badge>
            )}
          </div>

          <p
            className={cn(
              "mt-1 truncate text-[11px] leading-relaxed",
              isSelected ? "text-accent-foreground/75" : "text-muted-foreground"
            )}
          >
            {dm.message}
          </p>
        </div>
      </div>
    </button>
  )
}

function DMDetailView({
  dm,
  onMarkReplied,
  markingReplied,
}: {
  dm: DMItem
  onMarkReplied: (id: string) => void
  markingReplied: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(dm.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{dm.recipientName || "Unknown"}</h3>
            <Badge variant="outline" className="shrink-0 text-[10px]">{dm.platform}</Badge>
          </div>
          {dm.recipientHandle && (
            <p className="mt-0.5 text-xs text-muted-foreground">@{dm.recipientHandle}</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className={cn(
            "shrink-0 gap-1.5 transition-all duration-200",
            copied && "border-transparent bg-primary/10 text-primary"
          )}
        >
          {copied ? (
            <><Check className="size-3.5" />Copied</>
          ) : (
            <><Copy className="size-3.5" />Copy DM</>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {/* Recipient info */}
          <RecipientProfile
            name={dm.recipientName}
            email={dm.recipientEmail}
            handle={dm.recipientHandle}
            profileUrl={dm.recipientProfileUrl}
            platform={dm.platform}
            compact
          />

          <Separator />

          {/* Chat-style message bubble — outbound */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Your DM</p>
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary text-primary-foreground p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{dm.message}</p>
                <p className="mt-2 text-[10px] text-primary-foreground/60 text-right">
                  {formatDate(dm.sentAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              Copied {formatDate(dm.sentAt)}
            </span>
            {dm.responseReceivedAt && (
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 className="size-3" />
                Replied {formatDate(dm.responseReceivedAt)}
              </span>
            )}
          </div>

          {dm.lifecycleState && dm.lifecycleState !== "RESPONDED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={markingReplied}
              onClick={() => onMarkReplied(dm.id)}
              className="gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              Mark as replied
            </Button>
          )}

          <Separator />

          {/* Post context */}
          {dm.postText && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Triggered by post
              </p>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">{dm.postText}</p>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            {dm.postUrl && <PostLink url={dm.postUrl} />}
            {dm.recipientProfileUrl && (
              <a
                href={dm.recipientProfileUrl}
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
        <MessageCircle className="size-5" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-muted-foreground">Select a message to view</p>
    </div>
  )
}

type DMsPanelProps = {
  dms: DMItem[]
  onMarkReplied?: (id: string) => Promise<void>
}

export function DMsPanel({ dms, onMarkReplied }: DMsPanelProps) {
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [markingReplied, setMarkingReplied] = useState(false)

  const platforms = useMemo(() => [...new Set(dms.map((d) => d.platform))], [dms])

  const filtered = useMemo(() => {
    let items = dms
    if (platformFilter !== "all") {
      items = items.filter((d) => d.platform === platformFilter)
    }
    items = filterBySearch(items, search)
    return sortByField(items, "sentAt", "desc")
  }, [dms, search, platformFilter])

  const selectedDM = filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null

  const handleMarkReplied = async (id: string) => {
    if (!onMarkReplied) return
    setMarkingReplied(true)
    try {
      await onMarkReplied(id)
    } finally {
      setMarkingReplied(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden shadow-sm bg-card">
      {/* Left — Thread list */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-3 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-muted/30 border-border/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setPlatformFilter("all")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition-colors",
                platformFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              All <span className="opacity-70">{dms.length}</span>
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatformFilter(p)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold transition-colors",
                  platformFilter === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {p} <span className="opacity-70">{dms.filter((d) => d.platform === p).length}</span>
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <EmptyList filtered={search.length > 0 || platformFilter !== "all"} />
          ) : (
            <div>
              {filtered.map((dm) => (
                <DMListItem
                  key={dm.id}
                  dm={dm}
                  isSelected={dm.id === selectedDM?.id}
                  onClick={() => setSelectedId(dm.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right — Detail */}
      <div className="flex flex-1 flex-col min-w-0 bg-background">
        {selectedDM ? (
          <DMDetailView
            dm={selectedDM}
            onMarkReplied={handleMarkReplied}
            markingReplied={markingReplied}
          />
        ) : (
          <NoSelection />
        )}
      </div>
    </div>
  )
}
