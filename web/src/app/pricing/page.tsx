import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DraftAIBrand } from "@/components/draft-ai-brand"

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Taste the magic during beta.",
    features: ["10 drafts / month", "3 emails / month", "Chrome extension", "Reply tracking"],
    cta: "Try a draft",
    href: "/try",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$25",
    period: "/ month",
    description: "For active job seekers.",
    features: ["Unlimited drafts", "100 emails / month", "Tone insights", "Winning templates"],
    cta: "Join beta — free now",
    href: "/onboarding",
    highlighted: true,
    badge: "Coming soon",
  },
  {
    name: "Power",
    price: "$49",
    period: "/ month",
    description: "Career changers and power users.",
    features: ["Higher email limits", "Priority AI", "Advanced analytics", "Early features"],
    cta: "Join beta — free now",
    href: "/onboarding",
    highlighted: false,
    badge: "Coming soon",
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <DraftAIBrand href="/" subtitle="Pricing" />
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl tracking-tight text-foreground">Simple, honest pricing</h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Draft AI is free during beta. Paid plans launch when billing goes live — no surprises.
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
                  {plan.badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {plan.badge}
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
                <Button className="w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
