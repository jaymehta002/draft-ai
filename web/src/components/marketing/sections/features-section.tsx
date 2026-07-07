import {
  BarChart3,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react"
import { ScrollReveal, StaggerContainer, StaggerItem } from "@/components/motion"

const FEATURES = [
  {
    icon: Sparkles,
    title: "Context-aware drafts",
    body: "Every message draws from the post in front of you and your resume — not a fill-in-the-blank template.",
  },
  {
    icon: Mail,
    title: "Send email in place",
    body: "Found an email in a post? Draft AI sends through your Gmail so replies land in your inbox.",
  },
  {
    icon: Zap,
    title: "Instant, and cached",
    body: "Drafts arrive in seconds. Repeat context is cached so you wait less and spend fewer tokens.",
  },
  {
    icon: BarChart3,
    title: "Outreach analytics",
    body: "Track drafts, sends, and replies across platforms — see what's actually working.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tone you control",
    body: "Warm, direct, or formal. Set your voice once; every draft follows it.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    body: "Your resume powers your outreach. Nothing is sold, shared, or repurposed.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-slate-100 bg-zinc-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <ScrollReveal>
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Features</p>
            <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
              Everything between &ldquo;I saw your post&rdquo; and &ldquo;they replied.&rdquo;
            </h2>
            <p className="mt-4 text-muted-foreground">
              From the post in your feed to a message worth sending — without leaving the page you
              already have open.
            </p>
          </div>
        </ScrollReveal>

        <StaggerContainer className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <article className="group relative rounded-2xl border border-slate-100 bg-white p-6 transition-[background-color,box-shadow,border-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-5" strokeWidth={1.75} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
