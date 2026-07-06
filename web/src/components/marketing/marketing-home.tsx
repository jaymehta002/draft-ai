"use client"

import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  Zap,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  BarChart3,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/motion"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { DraftAIBrand } from "@/components/draft-ai-brand"

const CALLBACK_URL = "/onboarding"

function SignInButton({
  children,
  size = "default",
  className,
  variant,
}: {
  children: React.ReactNode
  size?: "default" | "sm" | "lg"
  className?: string
  variant?: "default" | "outline" | "ghost"
}) {
  return (
    <GoogleSignInExplainer
      callbackUrl={CALLBACK_URL}
      trigger={(open) => (
        <Button onClick={open} size={size} className={className} variant={variant}>
          {children}
        </Button>
      )}
    />
  )
}

function Wordmark() {
  return <DraftAIBrand subtitle="Outreach Studio" href="/" />
}

function SocialProof() {
  const testimonials = [
    {
      quote:
        "I stopped copy-pasting templates. Two hiring managers replied in my first week because the messages actually referenced their posts.",
      name: "Priya S.",
      role: "Software engineer · beta user",
    },
    {
      quote:
        "The draft button in my feed is the whole workflow. Upload resume once, then every message pulls from my real experience.",
      name: "Marcus T.",
      role: "Product manager · beta user",
    },
    {
      quote:
        "It feels like starting a conversation, not blasting outreach. I edit every message before I send — that's what sold me.",
      name: "Elena R.",
      role: "Career changer · beta user",
    },
  ]

  return (
    <section className="border-y border-border/70 bg-card/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-8">
          Used by job seekers from YC startups · FAANG · bootcamps
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote
              key={t.name}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-foreground">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.name}</span>
                <span className="mx-1.5">·</span>
                {t.role}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

function PlatformTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] font-medium tracking-tight text-foreground/80 shadow-xs">
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Signature: the before / after outreach comparison. This is the one thing the
// product does, shown rather than described — a limp template next to a message
// Draft AI tuned to the post and the sender's resume.
// ---------------------------------------------------------------------------

function MessageComparison() {
  return (
    <div className="relative">
      {/* soft tinted glow behind the stack for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/5 blur-2xl"
      />

      <div className="space-y-4">
        {/* Before — the message everyone sends */}
        <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Generic template
            </span>
            <span className="text-[11px] text-muted-foreground/70">sent by everyone</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground line-through decoration-muted-foreground/30">
            Hi! I came across your profile and I&apos;m really impressed by your
            work. I&apos;d love to connect and explore potential opportunities.
            Let me know if you&apos;re open to chat!
          </p>
        </div>

        {/* After — floating, tuned, the hero of the pair */}
        <div className="relative rounded-2xl border border-primary/25 bg-card p-5 shadow-lg ring-1 ring-primary/10">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-3" strokeWidth={2} />
              Draft AI
            </span>
            <PlatformTag>LinkedIn</PlatformTag>
          </div>
          <p className="font-mono text-[13px] leading-relaxed text-foreground">
            Congrats on shipping the realtime collab feature — your write-up on
            conflict resolution was sharp. I spent the last two years building
            CRDT sync at Scaleflow and would love to compare notes on how your
            team handled offline merges.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary">
              <Check className="size-3.5" strokeWidth={2.5} /> References the post
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span>Pulled from your resume</span>
            <span className="text-muted-foreground/40">·</span>
            <span>Drafted in ~2s</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

const STEPS = [
  {
    title: "Set up your profile once",
    body: "Upload your resume and Draft AI reads your experience, projects, and skills. This is the context every message draws from.",
  },
  {
    title: "Browse X and LinkedIn like normal",
    body: "A Draft button appears on posts. No new tab, no copy-paste — you stay in the feed where you already spend time.",
  },
  {
    title: "Generate, edit, and send",
    body: "Get a message written for that specific post and your background. Tweak it, then send the email or copy the DM.",
  },
]

const FEATURES = [
  {
    icon: Sparkles,
    title: "Context-aware drafts",
    body: "Every message is built from the post in front of you and your own resume — not a fill-in-the-blank template.",
  },
  {
    icon: Mail,
    title: "Send email in place",
    body: "Found an email in a post? Draft AI sends it through your own Gmail, so replies land in your inbox.",
  },
  {
    icon: Zap,
    title: "Instant, and cached",
    body: "Drafts arrive in seconds. Repeat context is cached, so you spend fewer tokens and less time waiting.",
  },
  {
    icon: BarChart3,
    title: "Outreach analytics",
    body: "See drafts generated, emails sent, DMs copied, and which platforms you're actually getting traction on.",
  },
  {
    icon: SlidersHorizontal,
    title: "Tone you control",
    body: "Warm, direct, or formal — set your voice in preferences and every draft follows it.",
  },
  {
    icon: ShieldCheck,
    title: "Your data stays yours",
    body: "Your resume and drafts are used to write your outreach, and nothing else. No selling, no surprises.",
  },
]

const STATS = [
  { value: "3×", label: "more thoughtful than generic templates" },
  { value: "Beta", label: "job seekers drafting daily" },
  { value: "~2s", label: "to a message tuned to the post" },
]

export function MarketingHome() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient depth — tinted, blurred fields layered behind the page */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-[30rem] -right-40 h-[28rem] w-[28rem] rounded-full bg-accent/40 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <Link href="/privacy-policy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
          </nav>
          <SignInButton size="sm" className="shrink-0">
            Sign in
          </SignInButton>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <FadeIn>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground shadow-xs">
              <span className="size-1.5 rounded-full bg-primary" />
              For job seekers who reach out first
            </p>
            <h1 className="font-serif text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Stop sending outreach that reads like everyone else&apos;s.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Draft AI turns any X or LinkedIn post into a message written for
              that person and your background — so your cold reach-outs sound
              deliberate, and actually get replies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SignInButton size="lg" className="group">
                Get started free
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </SignInButton>
              <Button variant="outline" size="lg" asChild>
                <Link href="/try">Try a draft</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> Sign in with Google
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> Bring your own resume
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.12}>
            <MessageComparison />
          </FadeIn>
        </div>
      </section>

      <SocialProof />

      {/* Platform strip */}
      <section className="border-y border-border/70 bg-card/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:flex-row sm:gap-4 sm:px-6 lg:px-8">
          <span className="text-sm text-muted-foreground">Draft AI lives where you already reach out</span>
          <span className="hidden text-muted-foreground/40 sm:inline">·</span>
          <div className="flex items-center gap-2">
            <PlatformTag>X</PlatformTag>
            <PlatformTag>LinkedIn</PlatformTag>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <StaggerContainer className="grid gap-8 sm:grid-cols-3">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label} className="text-center sm:text-left">
              <p className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stat.label}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* How it works — a genuine three-step sequence, so the numbering earns its place */}
      <section id="how" className="scroll-mt-20 border-t border-border/70 bg-card/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeIn>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
              From a post to a message worth sending, without leaving the page.
            </h2>
          </FadeIn>

          <StaggerContainer className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <StaggerItem key={step.title} className="relative">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card font-mono text-sm font-semibold text-primary shadow-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <h3 className="font-serif text-xl tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <FadeIn>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            What you get
          </p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            Everything you need to reach out with intent.
          </h2>
        </FadeIn>

        <StaggerContainer className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <StaggerItem
              key={title}
              className="group bg-card p-7 transition-colors duration-200 hover:bg-card/60"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 font-serif text-lg tracking-tight text-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Trust + CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-8 rounded-2xl border border-border bg-muted/30 px-6 py-5 text-center">
            <p className="text-sm font-medium text-foreground">
              You review every message. Draft AI never auto-sends or mass-messages.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Works on posts you choose — not a bot.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-lg sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]"
            />
            <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
              Your next message could be the one that lands.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
              Sign in with Google, add your resume, and start conversations
              that are worth a reply.
            </p>
            <div className="mt-8 flex justify-center">
              <SignInButton size="lg" className="group">
                Get started free
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </SignInButton>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
          <Wordmark />
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <Link href="/privacy-policy" className="transition-colors hover:text-foreground">Privacy</Link>
            <SignInButton variant="ghost" className="transition-colors hover:text-foreground text-sm text-muted-foreground h-auto p-0">
              Sign in
            </SignInButton>
          </nav>
        </div>
        <div className="border-t border-border/50">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-muted-foreground/70 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} Draft AI · AI-powered outreach for job seekers
          </div>
        </div>
      </footer>
    </div>
  )
}
