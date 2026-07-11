import { Check } from "lucide-react"
import { PRICING_TIERS } from "@/lib/recruiters-content"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { SectionHeader } from "@/components/recruiters/section-header"

export function EnterprisePricing() {
  return (
    <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="PRICING"
          headline="Plans that scale with your hiring"
          subheadline="Month-to-month on Starter and Growth. Enterprise includes custom terms."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.name}
              className={`pricing-card flex flex-col rounded-2xl p-6 ${
                tier.highlighted
                  ? "pricing-card-growth recruit-surface-elevated"
                  : "recruit-surface"
              }`}
            >
              {tier.highlighted && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  Most Popular
                </span>
              )}
              <h3 className="font-display text-xl text-foreground">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
              <p className="mt-4 font-display text-3xl text-foreground">
                {tier.price}
                {tier.period && (
                  <span className="text-base font-sans text-muted-foreground">
                    {tier.period}
                  </span>
                )}
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={getCalDemoUrl(tier.calTier)}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-8 inline-flex justify-center rounded-xl px-4 py-3 text-sm font-semibold ${
                  tier.highlighted ? "recruit-cta-primary" : "recruit-cta-secondary"
                }`}
              >
                Book a demo
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
