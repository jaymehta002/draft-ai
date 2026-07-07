import type { Metadata } from "next"
import { RecruitersHeader } from "@/components/recruiters/recruiters-header"
import { RecruitersFooter } from "@/components/recruiters/recruiters-footer"
import { HeroSection } from "@/components/recruiters/hero-section"
import { ParadigmSection } from "@/components/recruiters/paradigm/paradigm-section"
import { BentoGrid } from "@/components/recruiters/bento/bento-grid"
import { EnterprisePricing } from "@/components/recruiters/pricing/enterprise-pricing"
import { RecruitersFaq } from "@/components/recruiters/recruiters-faq"
import { FinalCtaSection } from "@/components/recruiters/final-cta-section"
import { RECRUITERS_META, buildRecruitersJsonLd } from "@/lib/recruiters-content"

export const metadata: Metadata = {
  title: RECRUITERS_META.title,
  description: RECRUITERS_META.description,
  alternates: { canonical: "/recruiters" },
  openGraph: {
    title: RECRUITERS_META.title,
    description: RECRUITERS_META.description,
    url: "/recruiters",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: RECRUITERS_META.title,
    description: RECRUITERS_META.description,
  },
}

export default function RecruitersPage() {
  const jsonLd = buildRecruitersJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecruitersHeader />
      <main>
        <HeroSection />
        <ParadigmSection />
        <BentoGrid />
        <EnterprisePricing />
        <RecruitersFaq />
        <FinalCtaSection />
      </main>
      <RecruitersFooter />
    </>
  )
}
