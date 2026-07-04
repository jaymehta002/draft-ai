"use client"

import { useMemo, useState } from "react"
import { ExpandableTable } from "@/components/ui/expandable-table"
import { PanelToolbar, FilterPill } from "@/components/panel-toolbar"
import { PostLink } from "@/components/post-link"
import { RecipientProfile } from "@/components/recipient-profile"
import { filterBySearch, sortByField } from "@/lib/panel-filters"
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

type DMsPanelProps = {
  dms: DMItem[]
}

export function DMsPanel({ dms }: DMsPanelProps) {
  const [search, setSearch] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const platforms = useMemo(() => [...new Set(dms.map((d) => d.platform))], [dms])

  const filtered = useMemo(() => {
    let items = dms
    if (platformFilter !== "all") {
      items = items.filter((d) => d.platform === platformFilter)
    }
    items = filterBySearch(items, search)
    return sortByField(items, "sentAt", "desc")
  }, [dms, search, platformFilter])

  const columns = [
    {
      key: "recipient",
      header: "Recipient",
      cell: (dm: DMItem) => (
        <p className="font-medium">{dm.recipientName || "Unknown"}</p>
      ),
    },
    {
      key: "platform",
      header: "Platform",
      className: "hidden sm:table-cell",
      cell: (dm: DMItem) => (
        <span className="text-xs text-muted-foreground">{dm.platform}</span>
      ),
    },
    {
      key: "preview",
      header: "Message",
      className: "hidden md:table-cell max-w-xs",
      cell: (dm: DMItem) => (
        <p className="text-xs text-muted-foreground truncate">{dm.message}</p>
      ),
    },
    {
      key: "sentAt",
      header: "Copied",
      className: "hidden lg:table-cell",
      cell: (dm: DMItem) => (
        <span className="text-xs text-muted-foreground tabular-nums">{formatDate(dm.sentAt)}</span>
      ),
    },
  ]

  return (
    <div>
      <PanelToolbar search={search} onSearchChange={setSearch} placeholder="Search DMs..." className="mb-4">
        <FilterPill active={platformFilter === "all"} onClick={() => setPlatformFilter("all")} count={dms.length}>
          All
        </FilterPill>
        {platforms.map((p) => (
          <FilterPill
            key={p}
            active={platformFilter === p}
            onClick={() => setPlatformFilter(p)}
            count={dms.filter((d) => d.platform === p).length}
          >
            {p}
          </FilterPill>
        ))}
      </PanelToolbar>

      <ExpandableTable
        columns={columns}
        data={filtered}
        expandedId={expandedId}
        onToggle={(id) => setExpandedId((prev) => (prev === id ? null : id))}
        emptyMessage="No DMs copied yet. Copy from the extension on X or LinkedIn."
        renderExpanded={(dm) => (
          <div className="grid gap-6 lg:grid-cols-2 pl-6 border-l-2 border-foreground/10">
            <div className="space-y-4">
              <RecipientProfile
                name={dm.recipientName}
                email={dm.recipientEmail}
                handle={dm.recipientHandle}
                profileUrl={dm.recipientProfileUrl}
                platform={dm.platform}
                compact
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Message</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{dm.message}</p>
              </div>
            </div>
            <div className="space-y-4">
              {dm.postText && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Original post</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-8">{dm.postText}</p>
                </div>
              )}
              <PostLink url={dm.postUrl} />
              <p className="text-xs text-muted-foreground">Copied {formatDate(dm.sentAt)}</p>
            </div>
          </div>
        )}
      />
    </div>
  )
}
