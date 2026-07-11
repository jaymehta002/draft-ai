import { Check, X } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/motion"

const ROWS = [
  {
    aspect: "Personalization",
    generic: "Fill in {{first_name}}, {{company}} and hope",
    draftAi: "Reads the actual post you're replying to",
  },
  {
    aspect: "Voice",
    generic: "Sounds like the same AI wrote it for everyone",
    draftAi: "Matches the tone you set, every time",
  },
  {
    aspect: "Source material",
    generic: "A generic one-line resume summary",
    draftAi: "Specific projects mapped to their post",
  },
  {
    aspect: "Control",
    generic: "Auto-sends in bulk while you sleep",
    draftAi: "You review and approve every message",
  },
]

export function DifferentiationSection() {
  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
              Not a template
            </p>
            <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
              Generic AI outreach reads like generic AI outreach.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Recipients can tell. Draft AI is built to draft the message you&apos;d actually send, not
              the one a template generator would.
            </p>
          </div>
        </ScrollReveal>

        <div className="mt-12 overflow-hidden rounded-2xl border border-slate-100">
          <div className="hidden grid-cols-[1fr_1.4fr_1.4fr] gap-px bg-slate-100 sm:grid">
            <div className="bg-zinc-50 px-6 py-4" />
            <div className="bg-zinc-50 px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Generic template tools
            </div>
            <div className="bg-primary/[0.04] px-6 py-4 font-mono text-[11px] uppercase tracking-wider text-primary">
              Draft AI
            </div>
          </div>

          <StaggerContainer className="flex flex-col gap-px bg-slate-100">
            {ROWS.map((row) => (
              <StaggerItem
                key={row.aspect}
                className="grid gap-px bg-slate-100 sm:grid-cols-[1fr_1.4fr_1.4fr]"
              >
                <div className="bg-white px-6 py-5 text-sm font-semibold text-foreground sm:bg-zinc-50/50">
                  {row.aspect}
                </div>
                <div className="flex items-start gap-2 bg-white px-6 py-5 text-sm text-muted-foreground">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" strokeWidth={2} />
                  {row.generic}
                </div>
                <div className="flex items-start gap-2 bg-primary/[0.03] px-6 py-5 text-sm text-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
                  {row.draftAi}
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  )
}
