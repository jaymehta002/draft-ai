"use client"

import { useMemo, useState } from "react"
import {
  Copy,
  Check,
  Sparkles,
  Mail,
  MessageCircle,
  ExternalLink,
  Clock,
  User,
} from "lucide-react"
import { PanelToolbar, FilterPill } from "@/components/panel-toolbar"
import { RecipientProfile } from "@/components/recipient-profile"
import { PostLink } from "@/components/post-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { filterBySearch, sortByField } from "@/lib/panel-filters"
import { formatDateTime } from "@/lib/format-date"
import { cn } from "@/lib/utils"
import type { getDraftsData } from "@/app/actions"
import { DraftActions } from "@/components/panels/draft-actions"

type DraftItem = Awaited<ReturnType<typeof getDraftsData>>["drafts"][number]

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return formatDateTime(iso)
}

function getInitial(name?: string | null, email?: string | null) {
  return ((name || email || "?")[0] || "?").toUpperCase()
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
        <Sparkles className="size-7" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {filtered ? "No matching drafts" : "No pending drafts"}
        </p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          {filtered
            ? "Try adjusting your search or filters"
            : "Open a post on X or LinkedIn and click the Draft AI extension to generate your first personalized outreach."}
        </p>
      </div>
    </div>
  )
}

function DraftListItem({
  draft,
  isSelected,
  onClick,
}: {
  draft: DraftItem
  isSelected: boolean
  onClick: () => void
}) {
  const initial = getInitial(draft.recipientName, draft.recipientEmail)
  const isEmail = draft.actionMode === "EMAIL"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left px-3 py-3 transition-[background-color,border-color] duration-150 border-b border-border/50 last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar initial */}
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-150",
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
              {draft.recipientName || draft.recipientEmail || "Unknown"}
            </p>
            <span
              className={cn(
                "shrink-0 text-[10px] tabular-nums",
                isSelected ? "text-accent-foreground/70" : "text-muted-foreground"
              )}
            >
              {formatRelative(draft.updatedAt)}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            {isEmail ? (
              <Mail className="size-2.5 shrink-0 text-muted-foreground" />
            ) : (
              <MessageCircle className="size-2.5 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-[10px] font-medium",
                isSelected ? "text-accent-foreground/80" : "text-muted-foreground"
              )}
            >
              {draft.platform}
            </span>
          </div>

          <p
            className={cn(
              "mt-1 truncate text-[11px] leading-relaxed",
              isSelected ? "text-accent-foreground/75" : "text-muted-foreground"
            )}
          >
            {draft.message}
          </p>
        </div>
      </div>
    </button>
  )
}

function DraftDetailView({ draft }: { draft: DraftItem }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft.message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">
              {draft.recipientName || draft.recipientEmail || "Unknown recipient"}
            </h3>
            <Badge variant={draft.actionMode === "EMAIL" ? "secondary" : "accent"} className="shrink-0">
              {draft.actionMode}
            </Badge>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {draft.platform}
            </Badge>
          </div>
          {draft.recipientEmail && draft.recipientName && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{draft.recipientEmail}</p>
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
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {/* Recipient info */}
          <RecipientProfile
            name={draft.recipientName}
            email={draft.recipientEmail}
            handle={draft.recipientHandle}
            profileUrl={draft.recipientProfileUrl}
            platform={draft.platform}
            compact
          />

          {/* Subject (email only) */}
          {draft.subject && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Subject</p>
              <p className="text-sm font-medium text-foreground">{draft.subject}</p>
            </div>
          )}

          <Separator />

          {/* Message canvas */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Message</p>
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {draft.message}
              </p>
            </div>
          </div>

          {/* Token stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3" />
              {draft.message.split(/\s+/).filter(Boolean).length} words
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatDateTime(draft.updatedAt)}
            </span>
          </div>

          <Separator />

          <DraftActions
            draftId={draft.id}
            actionMode={draft.actionMode}
            postUrl={draft.postUrl}
            message={draft.message}
            gmailConnected
          />

          <Separator />

          {/* Original post context */}
          {draft.postText && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Original post context
              </p>
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-8">
                  {draft.postText}
                </p>
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-2">
            {draft.postUrl && <PostLink url={draft.postUrl} />}
            {draft.recipientProfileUrl && (
              <a
                href={draft.recipientProfileUrl}
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
        <Sparkles className="size-5" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-muted-foreground">Select a draft to preview</p>
    </div>
  )
}

type DraftsPanelProps = {
  drafts: DraftItem[]
}

export function DraftsPanel({ drafts }: DraftsPanelProps) {
  const [search, setSearch] = useState("")
  const [modeFilter, setModeFilter] = useState<"all" | "EMAIL" | "DM">("all")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const stats = useMemo(
    () => ({
      all: drafts.length,
      EMAIL: drafts.filter((d) => d.actionMode === "EMAIL").length,
      DM: drafts.filter((d) => d.actionMode === "DM").length,
    }),
    [drafts]
  )

  const filtered = useMemo(() => {
    let items = drafts
    if (modeFilter !== "all") {
      items = items.filter((d) => d.actionMode === modeFilter)
    }
    items = filterBySearch(items, search)
    return sortByField(items, "updatedAt", "desc")
  }, [drafts, search, modeFilter])

  const selectedDraft = filtered.find((d) => d.id === selectedId) ?? null

  // Auto-select first item when list changes
  const effectiveSelected = selectedDraft ?? (filtered[0] ?? null)

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden shadow-sm bg-card">
      {/* Left — Draft list */}
      <div className="flex w-[300px] shrink-0 flex-col border-r border-border">
        {/* List toolbar */}
        <div className="border-b border-border p-3 space-y-2.5">
          <PanelToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search drafts..."
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterPill active={modeFilter === "all"} onClick={() => setModeFilter("all")} count={stats.all}>
              All
            </FilterPill>
            <FilterPill active={modeFilter === "EMAIL"} onClick={() => setModeFilter("EMAIL")} count={stats.EMAIL}>
              Email
            </FilterPill>
            <FilterPill active={modeFilter === "DM"} onClick={() => setModeFilter("DM")} count={stats.DM}>
              DM
            </FilterPill>
          </div>
        </div>

        {/* Draft list */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <EmptyState filtered={search.length > 0 || modeFilter !== "all"} />
          ) : (
            <div>
              {filtered.map((draft) => (
                <DraftListItem
                  key={draft.id}
                  draft={draft}
                  isSelected={draft.id === effectiveSelected?.id}
                  onClick={() => setSelectedId(draft.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right — Detail canvas */}
      <div className="flex flex-1 flex-col min-w-0 bg-background">
        {effectiveSelected ? (
          <DraftDetailView draft={effectiveSelected} />
        ) : (
          <NoSelection />
        )}
      </div>
    </div>
  )
}
