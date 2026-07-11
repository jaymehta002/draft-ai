"use client"

import Link from "next/link"
import { DraftAIBrand } from "@/components/draft-ai-brand"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { Button } from "@/components/ui/button"

const CALLBACK_URL = "/onboarding"

type Audience = "job-seeker" | "recruiter"

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

export function SiteFooter({ audience = "job-seeker" }: { audience?: Audience }) {
  const isRecruiter = audience === "recruiter"

  return (
    <footer className="border-t border-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
        <DraftAIBrand
          subtitle={isRecruiter ? "For Recruiters" : "Outreach Studio"}
          href={isRecruiter ? "/recruiters" : "/"}
        />
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          {isRecruiter ? (
            <>
              <Link href="/recruiters#product" className="transition-colors duration-200 hover:text-foreground">
                Product
              </Link>
              <Link href="/recruiters#pricing" className="transition-colors duration-200 hover:text-foreground">
                Pricing
              </Link>
              <Link href="/recruiters#faq" className="transition-colors duration-200 hover:text-foreground">
                FAQ
              </Link>
              <Link href="/" className="transition-colors duration-200 hover:text-foreground">
                Job seeker?
              </Link>
            </>
          ) : (
            <>
              <Link href="/#how" className="transition-colors duration-200 hover:text-foreground">
                How it works
              </Link>
              <Link href="/#features" className="transition-colors duration-200 hover:text-foreground">
                Features
              </Link>
              <Link href="/pricing" className="transition-colors duration-200 hover:text-foreground">
                Pricing
              </Link>
              <Link href="/recruiters" className="transition-colors duration-200 hover:text-foreground">
                For recruiters
              </Link>
            </>
          )}
          <Link href="/privacy-policy" className="transition-colors duration-200 hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="transition-colors duration-200 hover:text-foreground">
            Terms
          </Link>
          {!isRecruiter && <SignInLink />}
        </nav>
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-muted-foreground/70 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Draft AI ·{" "}
          {isRecruiter ? "Enterprise recruiting, reimagined" : "AI-powered outreach for job seekers"}
        </div>
      </div>
    </footer>
  )
}
