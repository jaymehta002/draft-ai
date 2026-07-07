"use client"

import Link from "next/link"
import { DraftAIBrand } from "@/components/draft-ai-brand"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { Button } from "@/components/ui/button"

const CALLBACK_URL = "/onboarding"

function SignInLink() {
  return (
    <GoogleSignInExplainer
      callbackUrl={CALLBACK_URL}
      trigger={(open) => (
        <Button onClick={open} variant="ghost" className="h-auto p-0 text-sm text-muted-foreground">
          Sign in
        </Button>
      )}
    />
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
        <DraftAIBrand subtitle="Outreach Studio" href="/" />
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <a href="/#how" className="transition-colors duration-200 hover:text-foreground">
            How it works
          </a>
          <a href="/#features" className="transition-colors duration-200 hover:text-foreground">
            Features
          </a>
          <Link href="/pricing" className="transition-colors duration-200 hover:text-foreground">
            Pricing
          </Link>
          <Link href="/recruiters" className="transition-colors duration-200 hover:text-foreground">
            For recruiters
          </Link>
          <Link href="/privacy-policy" className="transition-colors duration-200 hover:text-foreground">
            Privacy
          </Link>
          <SignInLink />
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-muted-foreground/70 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Draft AI · AI-powered outreach for job seekers
        </div>
      </div>
    </footer>
  )
}
