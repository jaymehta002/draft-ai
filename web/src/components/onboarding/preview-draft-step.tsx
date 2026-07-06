"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sparkles, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SAMPLE_POST_TEXT } from "@/lib/draft-prompt"

type DraftPreview = {
  message: string
  matchScore: number
  matchReason: string
  fitHighlights: string[]
}

export function PreviewDraftStep({
  onSkip,
}: {
  onSkip: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<DraftPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/try-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText: SAMPLE_POST_TEXT }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to generate")
      setDraft(json.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        Preview your first draft
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        See how Draft AI writes a message using your profile and a sample hiring post.
      </p>

      {!draft ? (
        <div className="space-y-4">
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate preview
              </>
            )}
          </Button>
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="rounded-2xl border border-primary/25 bg-card p-5 shadow-lg ring-1 ring-primary/10">
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Match {draft.matchScore}% — {draft.matchReason}
          </div>
          <p className="font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
            {draft.message}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3 text-[11px]">
            {draft.fitHighlights.map((h) => (
              <span key={h} className="inline-flex items-center gap-1 text-primary">
                <Check className="size-3.5" />
                {h}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
