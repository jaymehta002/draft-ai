import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { PERSONAS, getPersona } from "@/lib/seo-content"
import { siteUrl } from "@/lib/site"

export function generateStaticParams() {
  return PERSONAS.map((p) => ({ persona: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ persona: string }>
}): Promise<Metadata> {
  const { persona: slug } = await params
  const persona = getPersona(slug)
  if (!persona) return {}
  const url = `${siteUrl}/outreach/${persona.slug}`
  return {
    title: persona.metaTitle,
    description: persona.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: persona.metaTitle,
      description: persona.metaDescription,
      url,
    },
  }
}

export default async function OutreachPersonaPage({
  params,
}: {
  params: Promise<{ persona: string }>
}) {
  const { persona: slug } = await params
  const persona = getPersona(slug)
  if (!persona) notFound()

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: persona.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {persona.eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-5xl">
          {persona.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{persona.subtitle}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">See plans</Link>
          </Button>
        </div>

        <ul className="mt-12 grid gap-3 sm:grid-cols-2">
          {persona.bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground shadow-sm"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              {b}
            </li>
          ))}
        </ul>

        <section className="mt-16">
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <dl className="mt-6 space-y-6">
            {persona.faqs.map((f) => (
              <div key={f.q}>
                <dt className="text-base font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

      </main>
      <SiteFooter />
    </div>
  )
}
