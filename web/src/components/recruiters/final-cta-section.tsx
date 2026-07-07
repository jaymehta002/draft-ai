import { FINAL_CTA } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"

export function FinalCtaSection() {
  const demoUrl = getCalDemoUrl()

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[#1447e6]/25 bg-[#1447e6]/8 px-8 py-14 text-center">
        <h2 className="font-serif text-3xl tracking-tight text-[var(--recruit-text)] sm:text-4xl">
          {FINAL_CTA.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-[var(--recruit-muted)]">
          {FINAL_CTA.subheadline}
        </p>
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="recruit-cta-primary mt-8 inline-flex rounded-xl px-8 py-3.5 text-sm font-semibold"
        >
          {FINAL_CTA.cta}
        </a>
      </div>
    </section>
  )
}
