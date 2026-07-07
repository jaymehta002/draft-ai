import { HERO } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { HeroHeadlineCycle } from "./hero/hero-headline-cycle.client"
import { HeroEffectsLazy } from "./hero/hero-effects-lazy.client"

export function HeroSection() {
  const demoUrl = getCalDemoUrl()

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
      <div className="recruit-orb recruit-orb-1" aria-hidden="true" />
      <div className="recruit-orb recruit-orb-2" aria-hidden="true" />
      <HeroEffectsLazy />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#5085fb]">
          {HERO.eyebrow}
        </p>

        <h1 className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight text-[var(--recruit-text)] sm:text-5xl lg:text-6xl">
          <span aria-live="polite">
            <HeroHeadlineCycle headlines={HERO.headlines} />
          </span>
          <span className="sr-only">
            {" "}
            — also: {HERO.headlines.slice(1).join("; ")}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--recruit-muted)]">
          {HERO.subheadline}
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="recruit-cta-primary inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {HERO.primaryCta}
          </a>
          <a
            href="#product"
            className="recruit-cta-secondary inline-flex rounded-xl px-6 py-3 text-sm font-semibold"
          >
            {HERO.secondaryCta}
          </a>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {HERO.metrics.map((m) => (
            <div
              key={m.label}
              className="recruit-glass rounded-xl px-5 py-4 text-left"
            >
              <p className="font-serif text-2xl font-semibold text-[var(--recruit-text)]">
                {m.value}
              </p>
              <p className="mt-1 text-sm text-[var(--recruit-muted)]">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
