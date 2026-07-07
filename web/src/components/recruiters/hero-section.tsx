import { HERO } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/motion"
import { HeroHeadlineCycle } from "./hero/hero-headline-cycle.client"
import { CandidateRankPreview } from "./hero/candidate-rank-preview"

export function HeroSection() {
  const demoUrl = getCalDemoUrl()

  return (
    <section className="relative overflow-hidden bg-white pt-8 pb-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 right-0 h-[28rem] w-[28rem] rounded-full bg-primary/[0.05] blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[20rem] w-[20rem] rounded-full bg-slate-100 blur-[100px]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 lg:grid-cols-2 lg:px-8">
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
            {HERO.eyebrow}
          </p>

          <h1 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl lg:text-6xl">
            <span aria-live="polite">
              <HeroHeadlineCycle headlines={HERO.headlines} />
            </span>
            <span className="sr-only">
              {" "}
              — also: {HERO.headlines.slice(1).join("; ")}
            </span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{HERO.subheadline}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="shadow-[0_2px_12px_rgba(20,71,230,0.25)]" asChild>
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                {HERO.primaryCta}
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#product">{HERO.secondaryCta}</a>
            </Button>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-100 pt-8">
            {HERO.metrics.map((m) => (
              <div key={m.label}>
                <dt className="font-serif text-2xl text-foreground">{m.value}</dt>
                <dd className="text-xs text-muted-foreground">{m.label}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>

        <ScrollReveal delay={0.12}>
          <CandidateRankPreview />
        </ScrollReveal>
      </div>
    </section>
  )
}
