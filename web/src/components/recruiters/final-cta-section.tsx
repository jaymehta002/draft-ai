import { FINAL_CTA } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { Button } from "@/components/ui/button"
import { AmbientGrid } from "@/components/marketing/ambient-grid"

export function FinalCtaSection() {
  const demoUrl = getCalDemoUrl()

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-100 bg-white px-8 py-14 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <AmbientGrid fade="top" />
        <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {FINAL_CTA.headline}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
          {FINAL_CTA.subheadline}
        </p>
        <Button size="lg" className="mt-8 shadow-[0_2px_12px_rgba(20,71,230,0.25)]" asChild>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer">
            {FINAL_CTA.cta}
          </a>
        </Button>
      </div>
    </section>
  )
}
