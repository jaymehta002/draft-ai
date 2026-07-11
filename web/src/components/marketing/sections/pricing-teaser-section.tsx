import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/motion"
import { cn } from "@/lib/utils"

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Get a feel for the magic.",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/ month",
    blurb: "For active job seekers.",
    highlight: true,
  },
  {
    name: "Power",
    price: "$50",
    period: "/ month",
    blurb: "Career changers, power users.",
    highlight: false,
  },
]

export function PricingTeaserSection() {
  return (
    <section className="border-y border-slate-100 bg-zinc-50 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <div className="mx-auto max-w-xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Pricing</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight sm:text-4xl">
              Start free. Upgrade when it&apos;s working.
            </h2>
          </div>
        </ScrollReveal>

        <StaggerContainer className="mt-12 grid gap-4 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <StaggerItem key={tier.name}>
              <div
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-6",
                  tier.highlight
                    ? "border-primary/25 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
                    : "border-slate-100 bg-white"
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{tier.name}</p>
                  {tier.highlight && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Popular
                    </span>
                  )}
                </div>
                <p className="mt-3 font-display text-2xl tracking-tight text-foreground">
                  {tier.price}
                  <span className="ml-1 text-sm font-sans font-normal text-muted-foreground">
                    {tier.period}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{tier.blurb}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary"
          >
            <span className="relative">
              See full plan details
              <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
