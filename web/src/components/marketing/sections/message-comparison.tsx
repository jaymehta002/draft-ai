import { Check, Sparkles } from "lucide-react"

function PlatformTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-100 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-medium tracking-tight text-foreground/80">
      {children}
    </span>
  )
}

export function MessageComparison() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/5 blur-2xl"
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Generic template
            </span>
            <span className="text-[11px] text-muted-foreground/70">sent by everyone</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground line-through decoration-muted-foreground/30">
            Hi! I came across your profile and I&apos;m really impressed by your
            work. I&apos;d love to connect and explore potential opportunities.
            Let me know if you&apos;re open to chat!
          </p>
        </div>

        <div className="relative rounded-2xl border border-primary/25 bg-white p-5 shadow-lg ring-1 ring-primary/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-3" strokeWidth={2} />
              Draft AI
            </span>
            <PlatformTag>LinkedIn</PlatformTag>
          </div>
          <p className="font-mono text-[13px] leading-relaxed text-foreground">
            Congrats on shipping the realtime collab feature — your write-up on
            conflict resolution was sharp. I spent the last two years building
            CRDT sync at Scaleflow and would love to compare notes on how your
            team handled offline merges.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary">
              <Check className="size-3.5" strokeWidth={2.5} /> References the post
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>Pulled from your resume</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Drafted in ~2s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
