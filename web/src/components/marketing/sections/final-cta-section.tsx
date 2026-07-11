"use client"

import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { ScrollReveal } from "@/components/motion"
import { AmbientGrid } from "@/components/marketing/ambient-grid"

const CALLBACK_URL = "/onboarding"

export function FinalCtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="mb-8 rounded-2xl border border-slate-100 bg-zinc-50 px-6 py-5 text-center">
          <p className="text-sm font-medium text-foreground">
            You review every message. Draft AI never auto-sends or mass-messages.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Works on posts you choose — not a bot.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:px-12">
          <AmbientGrid fade="top" />
          <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl">
            Your next reply is one draft away.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            No credit card. Sign in with Google.
          </p>
          <div className="mt-8 flex justify-center">
            <GoogleSignInExplainer
              callbackUrl={CALLBACK_URL}
              trigger={(open) => (
                <Button onClick={open} size="lg" className="group">
                  Get started free
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Button>
              )}
            />
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
