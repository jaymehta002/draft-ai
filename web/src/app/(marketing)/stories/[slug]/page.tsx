import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/marketing/site-header"
import { SiteFooter } from "@/components/marketing/site-footer"
import { STORIES, getStory } from "@/lib/seo-content"
import { siteUrl } from "@/lib/site"

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const story = getStory(slug)
  if (!story) return {}
  const url = `${siteUrl}/stories/${story.slug}`
  return {
    title: story.metaTitle,
    description: story.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: story.metaTitle, description: story.metaDescription, url },
  }
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const story = getStory(slug)
  if (!story) notFound()

  const lift = Math.round((story.replyRateAfter / story.replyRateBefore) * 10) / 10

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Customer story
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-foreground">
          {story.name}, {story.role}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{story.summary}</p>

        <div className="mt-8 grid grid-cols-3 gap-4">
          <Stat label="Before" value={`${story.replyRateBefore}%`} />
          <Stat label="After" value={`${story.replyRateAfter}%`} accent />
          <Stat label="Reply lift" value={`${lift}x`} icon />
        </div>

        <blockquote className="mt-10 border-l-2 border-primary pl-5 font-serif text-xl italic text-foreground">
          “{story.quote}”
        </blockquote>

        <div className="mt-10 space-y-4 text-base leading-relaxed text-muted-foreground">
          {story.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <h2 className="font-serif text-2xl tracking-tight text-foreground">
            Write outreach that gets replies
          </h2>
          <Button size="lg" className="mt-5" asChild>
            <Link href="/try">
              Try Draft AI free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string
  value: string
  accent?: boolean
  icon?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center shadow-sm ${
        accent ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className="flex items-center justify-center gap-1 text-2xl font-semibold text-foreground">
        {icon && <TrendingUp className="size-5 text-primary" />}
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  )
}
