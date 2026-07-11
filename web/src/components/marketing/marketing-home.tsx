import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { HeroSection } from "@/components/marketing/sections/hero-section"
import { StatsSection } from "@/components/marketing/sections/stats-section"
import { HowItWorksSection } from "@/components/marketing/sections/how-it-works-section"
import { FeaturesSection } from "@/components/marketing/sections/features-section"
import { DifferentiationSection } from "@/components/marketing/sections/differentiation-section"
import { TrustSection } from "@/components/marketing/sections/trust-section"
import { PricingTeaserSection } from "@/components/marketing/sections/pricing-teaser-section"
import { FinalCtaSection } from "@/components/marketing/sections/final-cta-section"

export function MarketingHome() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-foreground">
      <SiteHeader audience="job-seeker" />
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DifferentiationSection />
      <TrustSection />
      <PricingTeaserSection />
      <FinalCtaSection />
      <SiteFooter />
    </div>
  )
}
