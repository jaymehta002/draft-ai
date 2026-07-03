"use client"

import { useMemo, useState } from "react"
import { ExpandableTable } from "@/components/ui/expandable-table"
import { PanelHeader, PanelToolbar, FilterPill } from "@/components/panel-toolbar"
import { PostLink } from "@/components/post-link"
import { RecipientProfile } from "@/components/recipient-profile"
import { filterBySearch, sortByField } from "@/lib/panel-filters"
import type { getDraftsData } from "@/app/actions"
import { cn } from "@/lib/utils"

type DraftItem = Awaited<ReturnType<typeof getDraftsData>>["drafts"][number]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

type DraftsPanelProps = {
  drafts: DraftItem[]
}

export function DraftsPanel({ drafts }: DraftsPanelProps) {
  const [search, setSearch] = useState("")
  const [modeFilter, setModeFilter] = useState<"all" | "EMAIL" | "DM">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  const columns = [
    {
      key: "recipient",
      header: "Recipient",
      cell: (draft: DraftItem) => (
        <div>
          <p className="font-medium">{draft.recipientName || draft.recipientEmail || "Unknown"}</p>
          {draft.recipientEmail && draft.recipientName && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{draft.recipientEmail}</p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      className: "hidden sm:table-cell",
      cell: (draft: DraftItem) => (
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            draft.actionMode === "EMAIL"
              ? "bg-blue-50 text-blue-700 ring-blue-600/20"
              : "bg-violet-50 text-violet-700 ring-violet-600/20"
          )}
        >
          {draft.actionMode}
        </span>
      ),
    },
    {
      key: "platform",
      header: "Platform",
      className: "hidden md:table-cell",
      cell: (draft: DraftItem) => (
        <span className="text-xs text-muted-foreground">{draft.platform}</span>
      ),
    },
    {
      key: "preview",
      header: "Preview",
      className: "hidden lg:table-cell max-w-xs",
      cell: (draft: DraftItem) => (
        <p className="text-xs text-muted-foreground truncate">{draft.message}</p>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      className: "hidden md:table-cell",
      cell: (draft: DraftItem) => (
        <span className="text-xs text-muted-foreground tabular-nums">{formatDate(draft.updatedAt)}</span>
      ),
    },
  ]

  return (
    <div>
      <PanelHeader
        title="Drafts"
        description="Unsent outreach only — sent emails move to the Emails tab"
      />

      <PanelToolbar search={search} onSearchChange={setSearch} placeholder="Search drafts..." className="mb-4">
        <FilterPill active={modeFilter === "all"} onClick={() => setModeFilter("all")} count={stats.all}>
          All
        </FilterPill>
        <FilterPill active={modeFilter === "EMAIL"} onClick={() => setModeFilter("EMAIL")} count={stats.EMAIL}>
          Email
        </FilterPill>
        <FilterPill active={modeFilter === "DM"} onClick={() => setModeFilter("DM")} count={stats.DM}>
          DM
        </FilterPill>
      </PanelToolbar>

      <ExpandableTable
        columns={columns}
        data={filtered}
        expandedId={expandedId}
        onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
        emptyMessage="No pending drafts. Generate one from X or LinkedIn with the extension."
        renderExpanded={(draft) => (
          <div className="grid gap-6 lg:grid-cols-2 pl-6 border-l-2 border-foreground/10">
            <div className="space-y-4">
              <RecipientProfile
                name={draft.recipientName}
                email={draft.recipientEmail}
                handle={draft.recipientHandle}
                profileUrl={draft.recipientProfileUrl}
                platform={draft.platform}
                compact
              />
              {draft.subject && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm font-medium">{draft.subject}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Message</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.message}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Original post</p>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-8">{draft.postText}</p>
              </div>
              <PostLink url={draft.postUrl} />
              <p className="text-xs text-muted-foreground">
                Created {formatDate(draft.createdAt)}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  )
}
