import { Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { PricingCta } from "@/components/pricing/pricing-cta"
import { PLAN_FEATURES, PLAN_PRICE_USD } from "@/lib/plans"

const PLANS = [
  {
    name: "Free",
    price: `$${PLAN_PRICE_USD.FREE}`,
    period: "forever",
    description: "Get a feel for the magic.",
    features: PLAN_FEATURES.FREE,
    highlighted: false,
  },
  {
    name: "Basic",
    price: `$${PLAN_PRICE_USD.BASIC}`,
    period: "/ month",
    description: "For active job seekers.",
    features: PLAN_FEATURES.BASIC,
    highlighted: false,
    tier: "BASIC" as const,
  },
  {
    name: "Pro",
    price: `$${PLAN_PRICE_USD.PRO}`,
    period: "/ month",
    description: "Career changers and power users.",
    features: PLAN_FEATURES.PRO,
    highlighted: true,
    tier: "PRO" as const,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader subtitle="Pricing" />

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl tracking-tight text-foreground">Simple, honest pricing</h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Start free. Upgrade when your job search heats up. Cancel anytime — no surprises.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={
                plan.highlighted
                  ? "border-primary/40 shadow-lg ring-1 ring-primary/20"
                  : "border-border shadow-sm"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.highlighted && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                      Most popular
                    </span>
                  )}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                <p className="pt-2">
                  <span className="text-3xl font-semibold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.tier && (
                  <PricingCta
                    tier={plan.tier}
                    label={`Upgrade to ${plan.name}`}
                    variant={plan.highlighted ? "default" : "outline"}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
