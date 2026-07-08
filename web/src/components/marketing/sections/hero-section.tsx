"use client"

import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { MagneticButton, ScrollReveal, FloatingCard } from "@/components/motion"
import { MessageComparison } from "./message-comparison"

const CALLBACK_URL = "/onboarding"

function SignInButton({
  children,
  size = "default",
  variant,
  className,
}: {
  children: React.ReactNode
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
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

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute top-96 -right-32 h-[24rem] w-[24rem] rounded-full bg-slate-100 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:pt-28 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <ScrollReveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-zinc-50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              For job seekers who reach out first
            </span>
            <h1 className="mt-5 font-serif text-4xl tracking-tight leading-[1.08] sm:text-5xl lg:text-6xl">
              Outreach that sounds like you wrote it on purpose.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Draft AI turns any X or LinkedIn post into a message built for that person and your
              background — so cold reach-outs feel deliberate, and actually get replies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <MagneticButton href="/try" size="lg">
                Try a draft
              </MagneticButton>
              <SignInButton size="lg" variant="outline">
                Get started free
              </SignInButton>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> Free to start
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> Sign in with Google
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> Bring your own resume
              </li>
            </ul>
          </ScrollReveal>

          <ScrollReveal delay={0.12}>
            <div className="relative lg:pl-4">
              <FloatingCard className="relative rounded-[1.25rem] border border-slate-100 bg-white p-1 shadow-[0_20px_60px_rgba(20,71,230,0.08)]">
                <MessageComparison />
              </FloatingCard>
              <div
                aria-hidden
                className="absolute inset-4 -z-10 rounded-2xl border border-slate-100 bg-zinc-50"
              />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
