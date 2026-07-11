import { TESTIMONIALS } from "@/lib/recruiters-content"
import { SectionHeader } from "@/components/recruiters/section-header"
import { StaggerContainer, StaggerItem } from "@/components/motion"

export function TestimonialsSection() {
  return (
    <section className="border-y border-slate-100 bg-zinc-50 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="TEAMS ALREADY HIRING FASTER"
          headline="Recruiters replaced the chaos, not the judgment"
        />

        <StaggerContainer className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <blockquote className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  {t.metric}
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <footer className="mt-6 border-t border-slate-100 pt-4 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="mx-1.5">·</span>
                  {t.role}
                </footer>
              </blockquote>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
