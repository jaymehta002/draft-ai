"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PIPELINE_COLUMN_LABELS, type PipelineColumn } from "@/lib/pipeline"
import { updateConversationMeta } from "@/app/actions/conversation"
import { cn } from "@/lib/utils"

type PipelineItem = {
  id: string
  type: "draft" | "outreach"
  column: PipelineColumn
  recipientName: string | null
  recipientEmail: string | null
  platform: string
  actionMode: string
  message: string
  postUrl: string | null
  matchScore: number | null
  toneUsed: string | null
  sentAt: string | null
  followUpEligible: boolean
  followUpType: "bump" | "close" | null
  conversationMeta: {
    company: string | null
    roleTitle: string | null
    pipelineStage: string
    notes: string | null
  } | null
}

type PipelineKanbanProps = {
  columns: Record<PipelineColumn, PipelineItem[]>
}

const COLUMN_ORDER: PipelineColumn[] = ["drafted", "sent", "awaiting", "replied"]

const COLUMN_HINTS: Record<PipelineColumn, string> = {
  drafted: "Draft your first post on LinkedIn or X",
  sent: "Conversations you started recently",
  awaiting: "No reply yet — consider a follow-up",
  replied: "Celebrate these wins!",
}

function daysSince(iso: string | null) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function PipelineCard({
  item,
  onSelect,
}: {
  item: PipelineItem
  onSelect: (item: PipelineItem) => void
}) {
  const days = daysSince(item.sentAt)
  const name = item.recipientName || item.recipientEmail || "Unknown"

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="w-full rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-grab"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="truncate text-xs font-semibold text-foreground">{name}</p>
        <Badge variant="outline" className="shrink-0 text-[9px]">
          {item.platform}
        </Badge>
      </div>
      <p className="line-clamp-2 text-[10px] text-muted-foreground">{item.message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {item.toneUsed && (
          <Badge variant="secondary" className="text-[9px] capitalize">
            {item.toneUsed}
          </Badge>
        )}
        {item.matchScore != null && (
          <span className="text-[9px] text-muted-foreground">{item.matchScore}% match</span>
        )}
        {days != null && item.column !== "replied" && (
          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
            <Clock className="size-2.5" />
            {days}d ago
          </span>
        )}
      </div>
    </button>
  )
}

function DetailDrawer({
  item,
  onClose,
  onFollowUp,
}: {
  item: PipelineItem
  onClose: () => void
  onFollowUp: (id: string, type: "bump" | "close") => void
}) {
  const [company, setCompany] = useState(item.conversationMeta?.company ?? "")
  const [roleTitle, setRoleTitle] = useState(item.conversationMeta?.roleTitle ?? "")
  const [stage, setStage] = useState(item.conversationMeta?.pipelineStage ?? "OUTREACH")
  const [notes, setNotes] = useState(item.conversationMeta?.notes ?? "")
  const [saving, setSaving] = useState(false)

  const saveMeta = async () => {
    if (item.type !== "outreach") return
    setSaving(true)
    try {
      await updateConversationMeta(item.id, {
        company: company || null,
        roleTitle: roleTitle || null,
        pipelineStage: stage,
        notes: notes || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border bg-card shadow-xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Conversation</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {item.recipientName || item.recipientEmail || "Unknown"}
            </p>
            <Badge variant="outline" className="mt-1 text-[10px]">
              {item.platform} · {item.actionMode}
            </Badge>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs whitespace-pre-wrap text-foreground">{item.message}</p>
          </div>
          {item.postUrl && (
            <Link
              href={item.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              View original post
            </Link>
          )}
          {item.type === "draft" && (
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/drafts">Open in drafts</Link>
            </Button>
          )}
          {item.followUpEligible && item.followUpType && (
            <Button
              size="sm"
              onClick={() => onFollowUp(item.id, item.followUpType!)}
            >
              Suggest {item.followUpType === "bump" ? "follow-up" : "graceful close"}
            </Button>
          )}
          {item.type === "outreach" && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                CRM
              </p>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                placeholder="Role title"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
              />
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="OUTREACH">Outreach</option>
                <option value="REPLIED">Replied</option>
                <option value="INTERVIEW">Interview</option>
                <option value="CLOSED">Closed</option>
              </select>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs min-h-[80px]"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button size="sm" onClick={saveMeta} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

export function PipelineKanban({ columns }: PipelineKanbanProps) {
  const [selected, setSelected] = useState<PipelineItem | null>(null)

  const handleFollowUp = async (sentOutreachId: string, followUpType: "bump" | "close") => {
    try {
      const res = await fetch("/api/follow-up-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentOutreachId, followUpType }),
      })
      if (res.ok) {
        window.location.href = "/dashboard/drafts"
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((col) => (
          <div key={col} className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-100 bg-zinc-50/50 p-3">
            <h3 className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {PIPELINE_COLUMN_LABELS[col]}{" "}
              <span className="text-foreground">{columns[col].length}</span>
            </h3>
            <ScrollArea className="h-[calc(100vh-14rem)] p-2">
              <div className="space-y-2">
                {columns[col].length === 0 ? (
                  <p className="px-2 py-6 text-center text-[10px] text-muted-foreground">
                    {COLUMN_HINTS[col]}
                  </p>
                ) : (
                  columns[col].map((item) => (
                    <PipelineCard key={`${item.type}-${item.id}`} item={item} onSelect={setSelected} />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelected(null)} />
          <DetailDrawer
            item={selected}
            onClose={() => setSelected(null)}
            onFollowUp={handleFollowUp}
          />
        </>
      )}
    </>
  )
}
