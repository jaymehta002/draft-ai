import { siteConfig, siteUrl } from "@/lib/site"
import { getCalDemoUrl } from "@/lib/cal-demo"

export type FaqItem = { q: string; a: string }

export type BentoAnimation = "morph" | "typewriter" | "tilt" | "none"

export type BentoCell = {
  id: string
  size: "sm" | "md" | "lg" | "wide"
  title: string
  body: string
  animation: BentoAnimation
  examplePrompt?: string
}

export type PricingTier = {
  name: string
  price: string
  period?: string
  tagline: string
  features: string[]
  highlighted?: boolean
  calTier: string
}

export const RECRUITERS_META = {
  title: "Draft AI for Recruiters — Enterprise Hiring, Reimagined",
  description:
    "Turn a single-line brief into ranked, interview-ready candidates. AI matching for tech teams — no ATS archaeology, no LinkedIn spam.",
  canonical: `${siteUrl}/recruiters`,
}

export const HERO = {
  eyebrow: "ENTERPRISE RECRUITING · REIMAGINED",
  headlines: [
    "Hire the top 1%.",
    "Before they reply to someone else.",
    "In days, not quarters.",
  ],
  subheadline:
    "Draft AI turns a single-line brief into ranked, interview-ready candidates — matched to your stack, culture, and comp band. No ATS archaeology. No LinkedIn spam.",
  primaryCta: "Launch Your Search",
  secondaryCta: "See how it works",
  metrics: [
    { value: "2.4×", label: "faster time-to-shortlist" },
    { value: "Top 1%", label: "tech talent active now" },
    { value: "94%", label: "match confidence on first pass" },
  ],
}

export const PARADIGM = {
  label: "THE OLD WAY VS. THE REDESIGN",
  headline: "Recruiting wasn't broken. The tools were.",
  subheadline:
    "Legacy workflows bury signal under noise. Draft AI replaces the chaos layer with a signal layer — from brief to ranked shortlist in one flow.",
  oldWay: {
    title: "The Chaos Layer",
    body: "Clunky ATS exports. 200-copy LinkedIn blasts. Spreadsheet graveyards.",
    items: [
      "47-tab ATS export, half the fields wrong",
      "LinkedIn InMail blast — 3% reply rate",
      "Spreadsheet v7_final_FINAL.xlsx",
      "Keyword filters miss culture fit",
    ],
  },
  newWay: {
    title: "The Signal Layer",
    body: "One-line job brief → AI-optimized posting. Resumes morph into ranked profiles.",
    items: [
      "Senior backend, Go + K8s, $180–220k",
      "AI-optimized JD posted in 12 seconds",
      "47 candidates ranked by stack + culture",
      "Top 5 ready for intro calls today",
    ],
  },
}

export const BENTO_CELLS: BentoCell[] = [
  {
    id: "matching",
    size: "lg",
    title: "AI Matching Engine",
    body: "Resumes don't just get scored — they morph into ranked candidate profiles with stack overlap, culture signals, and comp fit.",
    animation: "morph",
  },
  {
    id: "job-post",
    size: "sm",
    title: "One-Line Job Posts",
    body: "Type a brief. Get a polished, SEO-optimized job description that attracts the right candidates.",
    animation: "typewriter",
    examplePrompt: "Senior backend, Go + K8s, fintech, $180–220k, remote US",
  },
  {
    id: "command-center",
    size: "wide",
    title: "Recruiting Command Center",
    body: "Pipeline, outreach, and team collaboration in one view. No tab-switching between five tools.",
    animation: "tilt",
  },
  {
    id: "signal",
    size: "sm",
    title: "Talent Signal",
    body: "Surface candidates who are actively engaging with your space — before they hit the open market.",
    animation: "none",
  },
  {
    id: "team",
    size: "sm",
    title: "Team Collaboration",
    body: "Hiring managers, recruiters, and sourcers share one live shortlist with notes and scorecards.",
    animation: "none",
  },
  {
    id: "security",
    size: "sm",
    title: "Enterprise Security",
    body: "SOC 2 Type II, SSO, role-based access, and data residency options for global teams.",
    animation: "none",
  },
]

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "$499",
    period: "/mo",
    tagline: "For lean teams hiring 1–3 roles",
    calTier: "starter",
    features: [
      "Up to 3 active searches",
      "AI matching & ranked shortlists",
      "Job post generation",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$1,299",
    period: "/mo",
    tagline: "For teams scaling hiring",
    calTier: "growth",
    highlighted: true,
    features: [
      "Unlimited active searches",
      "Team collaboration & scorecards",
      "Priority AI matching",
      "Dedicated onboarding",
      "Slack + email support",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    tagline: "For orgs with complex hiring needs",
    calTier: "enterprise",
    features: [
      "Custom integrations & ATS sync",
      "SSO & advanced RBAC",
      "Dedicated CSM",
      "SLA & data residency",
      "Volume pricing",
    ],
  },
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "How is Draft AI different from our ATS?",
    a: "Your ATS stores candidates. Draft AI finds and ranks them. We sit upstream — turning a one-line brief into interview-ready shortlists — and sync results back to Greenhouse, Lever, or Ashby when you're ready.",
  },
  {
    q: "What does onboarding look like for enterprise teams?",
    a: "Growth and Enterprise plans include a dedicated onboarding session. We map your hiring workflow, configure team access, and run your first search live — most teams are fully operational within a week.",
  },
  {
    q: "How does AI matching work without keyword stuffing?",
    a: "We analyze stack overlap, project impact, culture signals from writing style, and comp alignment — not just keyword density. Every match comes with a confidence score and explainable reasoning.",
  },
  {
    q: "Is candidate data SOC 2 compliant?",
    a: "Yes. Draft AI is SOC 2 Type II certified. Enterprise plans include SSO, role-based access controls, audit logs, and optional data residency in US or EU regions.",
  },
  {
    q: "Can we try before committing to an annual contract?",
    a: "Absolutely. Book a demo and we'll run a live search on one of your open roles. Starter and Growth are month-to-month — cancel anytime.",
  },
  {
    q: "Does Draft AI replace our recruiters?",
    a: "No — it makes them faster. Recruiters spend less time on ATS archaeology and more time on conversations that close candidates. Most teams see 2–3× faster time-to-shortlist.",
  },
]

export const FINAL_CTA = {
  headline: "Ready to hire the top 1%?",
  subheadline:
    "Book a 30-minute demo. We'll run a live search on one of your open roles — no slide deck required.",
  cta: "Book a demo",
}

export function buildRecruitersJsonLd() {
  const demoUrl = getCalDemoUrl()

  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteConfig.name,
      url: siteUrl,
      description: RECRUITERS_META.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${siteConfig.name} for Recruiters`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: RECRUITERS_META.description,
      offers: PRICING_TIERS.map((tier) => ({
        "@type": "Offer",
        name: tier.name,
        price: tier.price === "Custom" ? undefined : tier.price.replace("$", ""),
        priceCurrency: "USD",
        url: getCalDemoUrl(tier.calTier),
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: RECRUITERS_META.title,
      description: RECRUITERS_META.description,
      url: RECRUITERS_META.canonical,
      potentialAction: {
        "@type": "ReserveAction",
        target: demoUrl,
        name: "Book a demo",
      },
    },
  ]
}
