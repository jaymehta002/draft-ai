import { HERO } from "@/lib/recruiters-content"
import { StaggerContainer, StaggerItem } from "@/components/motion"

export function MetricsBand() {
  return (
    <section className="border-y border-slate-100 bg-zinc-50 py-14">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <StaggerContainer className="grid gap-8 sm:grid-cols-3">
          {HERO.metrics.map((m) => (
            <StaggerItem key={m.label} className="text-center sm:text-left">
              <p className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {m.value}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.label}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
