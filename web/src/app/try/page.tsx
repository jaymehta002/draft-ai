"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { DraftAIBrand } from "@/components/draft-ai-brand"
import { SAMPLE_POST_TEXT } from "@/lib/draft-prompt"
import { FadeIn } from "@/components/motion"

type DraftResult = {
  message: string
  subject: string | null
  actionMode: string
  matchScore: number
  matchReason: string
  fitHighlights: string[]
}

export default function TryPage() {
  const { data: session } = useSession()
  const [postText, setPostText] = useState(SAMPLE_POST_TEXT)
  const [bioHint, setBioHint] = useState("I spent the last two years building CRDT sync at Scaleflow")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftResult | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/try-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postText, bioHint: session ? undefined : bioHint }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to generate draft")
      setDraft(json.draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <DraftAIBrand subtitle="Try it now" />
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <FadeIn>
          <h1 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
            Preview your first draft
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Paste a post and see how Draft AI writes a message tuned to you — no extension needed.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Sample post</label>
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={5}
                className="font-mono text-sm"
              />
            </div>

            {!session && (
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  About you (one line)
                </label>
                <Input
                  value={bioHint}
                  onChange={(e) => setBioHint(e.target.value)}
                  placeholder="I built distributed systems at..."
                />
              </div>
            )}

            <Button onClick={handleGenerate} disabled={loading || !postText.trim()} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate draft
                </>
              )}
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {draft && (
              <div className="rounded-2xl border border-primary/25 bg-card p-5 shadow-lg ring-1 ring-primary/10">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                    <Sparkles className="size-3" />
                    Your draft
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Match {draft.matchScore}% — {draft.matchReason}
                  </span>
                </div>
                {draft.subject && (
                  <p className="mb-2 text-sm font-medium text-foreground">Subject: {draft.subject}</p>
                )}
                <p className="font-mono text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
                  {draft.message}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
                  {draft.fitHighlights.map((h) => (
                    <span key={h} className="inline-flex items-center gap-1 text-primary">
                      <Check className="size-3.5" strokeWidth={2.5} />
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="text-sm font-medium text-foreground">Get this in your LinkedIn feed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Install the Chrome extension to draft directly on X and LinkedIn posts.
              </p>
              <Button className="mt-4 gap-2" asChild>
                <Link href={session ? "/dashboard?section=extension" : "/onboarding"}>
                  {session ? "Open Integrations" : "Sign up free"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </main>
    </div>
  )
}
