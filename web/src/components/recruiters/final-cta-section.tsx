import { FINAL_CTA } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { Button } from "@/components/ui/button"

export function FinalCtaSection() {
  const demoUrl = getCalDemoUrl()

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-primary/20 bg-primary/[0.04] px-8 py-14 text-center shadow-[0_8px_30px_rgba(20,71,230,0.06)]">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
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
