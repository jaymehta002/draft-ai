import { HERO } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { Button } from "@/components/ui/button"
import { ScrollReveal } from "@/components/motion"
import { AmbientGrid } from "@/components/marketing/ambient-grid"
import { HeroHeadlineCycle } from "./hero/hero-headline-cycle.client"
import { CandidateRankPreview } from "./hero/candidate-rank-preview"

export function HeroSection() {
  const demoUrl = getCalDemoUrl()

  return (
    <section className="relative overflow-hidden bg-white pt-8 pb-16">
      <AmbientGrid />

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 lg:grid-cols-2 lg:px-8">
        <ScrollReveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
            {HERO.eyebrow}
          </p>

          <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl lg:text-6xl">
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

        </ScrollReveal>

        <ScrollReveal delay={0.12}>
          <CandidateRankPreview />
        </ScrollReveal>
      </div>
    </section>
  )
}
