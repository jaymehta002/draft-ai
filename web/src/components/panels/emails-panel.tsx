"use client"

import { useMemo, useState } from "react"
import { ExternalLink } from "lucide-react"
import { ExpandableTable } from "@/components/ui/expandable-table"
import { PanelToolbar, FilterPill } from "@/components/panel-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PostLink } from "@/components/post-link"
import { filterBySearch, sortByField } from "@/lib/panel-filters"
import { EMAIL_STATE_LABELS, type EmailLifecycleState } from "@/lib/outreach-state"
import { markEmailResponded } from "@/app/actions"
import type { getEmailsData } from "@/app/actions"

type EmailItem = Awaited<ReturnType<typeof getEmailsData>>["emails"][number]

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

function StateBadge({ state }: { state: EmailLifecycleState | null }) {
  if (!state) return null
  const variants: Record<EmailLifecycleState, React.ComponentProps<typeof Badge>["variant"]> = {
    SENT: "secondary",
    AGED: "warning",
    RESPONDED: "accent",
  }
  return <Badge variant={variants[state]}>{EMAIL_STATE_LABELS[state]}</Badge>
}

type EmailsPanelProps = {
  emails: EmailItem[]
  onRefresh?: () => void
}

export function EmailsPanel({ emails, onRefresh }: EmailsPanelProps) {
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<"all" | EmailLifecycleState>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const stats = useMemo(
    () => ({
      all: emails.length,
      SENT: emails.filter((e) => e.lifecycleState === "SENT").length,
      AGED: emails.filter((e) => e.lifecycleState === "AGED").length,
      RESPONDED: emails.filter((e) => e.lifecycleState === "RESPONDED").length,
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

  const handleMarkResponded = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setMarkingId(id)
    try {
      await markEmailResponded(id)
      onRefresh?.()
    } finally {
      setMarkingId(null)
    }
  }

  const columns = [
    {
      key: "recipient",
      header: "Recipient",
      cell: (email: EmailItem) => (
        <div className="min-w-[160px]">
          <p className="font-medium text-foreground">
            {email.recipientName || "Unknown"}
          </p>
          {email.recipientEmail && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {email.recipientEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      className: "hidden md:table-cell max-w-[240px]",
      cell: (email: EmailItem) => (
        <p className="truncate text-muted-foreground">{email.subject || "—"}</p>
      ),
    },
    {
      key: "platform",
      header: "Platform",
      className: "hidden sm:table-cell",
      cell: (email: EmailItem) => (
        <span className="text-xs font-medium text-muted-foreground">{email.platform}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (email: EmailItem) => <StateBadge state={email.lifecycleState} />,
    },
    {
      key: "sentAt",
      header: "Sent",
      className: "hidden lg:table-cell",
      cell: (email: EmailItem) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatRelative(email.sentAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-32",
      cell: (email: EmailItem) =>
        email.lifecycleState !== "RESPONDED" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={markingId === email.id}
            onClick={(e) => handleMarkResponded(e, email.id)}
          >
            Mark responded
          </Button>
        ) : null,
    },
  ]

  return (
    <div>
      <PanelToolbar search={search} onSearchChange={setSearch} placeholder="Search emails..." className="mb-4">
        <FilterPill active={stateFilter === "all"} onClick={() => setStateFilter("all")} count={stats.all}>
          All
        </FilterPill>
        <FilterPill active={stateFilter === "SENT"} onClick={() => setStateFilter("SENT")} count={stats.SENT}>
          Sent
        </FilterPill>
        <FilterPill active={stateFilter === "AGED"} onClick={() => setStateFilter("AGED")} count={stats.AGED}>
          Aged
        </FilterPill>
        <FilterPill active={stateFilter === "RESPONDED"} onClick={() => setStateFilter("RESPONDED")} count={stats.RESPONDED}>
          Responded
        </FilterPill>
      </PanelToolbar>

      <ExpandableTable
        columns={columns}
        data={filtered}
        expandedId={expandedId}
        onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
        emptyMessage="No emails sent yet. Send from the extension — they'll appear here automatically."
        renderExpanded={(email) => (
          <div className="grid gap-6 lg:grid-cols-2 pl-6 border-l-2 border-foreground/10">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Message
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {email.message}
                </p>
              </div>
              {email.subject && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Subject
                  </p>
                  <p className="text-sm font-medium">{email.subject}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {email.postText && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Original post
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">
                    {email.postText}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {email.postUrl && (
                  <PostLink url={email.postUrl} label="View post" />
                )}
                {email.recipientProfileUrl && (
                  <a
                    href={email.recipientProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-primary underline-offset-4 transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View profile
                  </a>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/40">
                <p>Sent {formatDate(email.sentAt)}</p>
                {email.responseReceivedAt && (
                  <p>Responded {formatDate(email.responseReceivedAt)}</p>
                )}
              </div>
            </div>
          </div>
        )}
      />
    </div>
  )
}
