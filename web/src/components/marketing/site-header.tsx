"use client"

import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  PenLine,
  Sparkles,
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { DraftAIBrand } from "@/components/draft-ai-brand"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { EASE_OUT } from "@/lib/motion-tokens"
import { cn } from "@/lib/utils"

const CALLBACK_URL = "/onboarding"

type MegaLink = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  external?: boolean
}

const JOB_SEEKER_LINKS: MegaLink[] = [
  {
    href: "/try",
    icon: PenLine,
    title: "Try a draft",
    description: "See a message before you sign up",
  },
  {
    href: "/#how",
    icon: Sparkles,
    title: "How it works",
    description: "Profile → browse → send",
  },
  {
    href: "/pricing",
    icon: BarChart3,
    title: "Pricing",
    description: "Free, Pro, and Power plans",
  },
]

const RECRUITER_LINKS: MegaLink[] = [
  {
    href: "/recruiters",
    icon: Building2,
    title: "Enterprise recruiting",
    description: "Brief to shortlist in days",
  },
  {
    href: getCalDemoUrl(),
    icon: Calendar,
    title: "Book a demo",
    description: "20-minute walkthrough",
    external: true,
  },
]

function SignInButton({ className }: { className?: string }) {
  return (
    <GoogleSignInExplainer
      callbackUrl={CALLBACK_URL}
      trigger={(open) => (
        <Button onClick={open} variant="ghost" size="sm" className={className}>
          Sign in
        </Button>
      )}
    />
  )
}

function MegaMenuLink({ link }: { link: MegaLink }) {
  const Icon = link.icon
  const content = (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{link.title}</p>
        <p className="text-xs text-muted-foreground">{link.description}</p>
      </div>
    </>
  )

  const className =
    "group/link flex gap-3 rounded-xl p-3 transition-colors duration-200 hover:bg-zinc-50"

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  }

  return (
    <Link href={link.href} className={className}>
      {content}
    </Link>
  )
}

function MegaMenuPanel() {
  return (
    <div
      className={cn(
        "invisible absolute left-1/2 top-full -translate-x-1/2 pt-3 opacity-0 translate-y-2",
        "transition-[opacity,transform] duration-300 ease-out",
        "group-hover:visible group-hover:opacity-100 group-hover:translate-y-0",
        "group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0"
      )}
    >
      <div className="w-[520px] rounded-2xl border border-slate-100 bg-white p-6 shadow-lg shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Job Seekers
            </p>
            <motion.ul
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              whileInView="show"
              className="space-y-1"
            >
              {JOB_SEEKER_LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
                  }}
                >
                  <MegaMenuLink link={link} />
                </motion.li>
              ))}
            </motion.ul>
          </div>
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              For Teams
            </p>
            <motion.ul
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              whileInView="show"
              className="space-y-1"
            >
              {RECRUITER_LINKS.map((link) => (
                <motion.li
                  key={link.href}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
                  }}
                >
                  <MegaMenuLink link={link} />
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </div>
  )
}

type SiteHeaderProps = {
  subtitle?: string
  minimal?: boolean
}

export function SiteHeader({ subtitle = "Outreach Studio", minimal = false }: SiteHeaderProps) {
  const { scrolled, hidden } = useScrollHeader()

  return (
    <>
      <header
        data-scrolled={scrolled}
        data-hidden={hidden}
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b border-transparent",
          "transition-[transform,background-color,border-color,box-shadow] duration-300",
          "data-[scrolled=true]:border-slate-100 data-[scrolled=true]:bg-white/80 data-[scrolled=true]:backdrop-blur-md data-[scrolled=true]:shadow-sm",
          "data-[hidden=true]:-translate-y-full"
        )}
      >
        <div
          data-compact={scrolled}
          className={cn(
            "mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8",
            "transition-[height] duration-300 data-[compact=true]:h-14"
          )}
        >
          <DraftAIBrand subtitle={subtitle} href="/" />

          {!minimal && (
            <nav className="hidden items-center gap-1 lg:flex">
              <div className="group relative">
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-zinc-50 hover:text-foreground"
                >
                  Product
                </button>
                <MegaMenuPanel />
              </div>
              <Link
                href="/pricing"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-zinc-50 hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                href="/recruiters"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-zinc-50 hover:text-foreground"
              >
                For Recruiters
              </Link>
            </nav>
          )}

          <div className="flex items-center gap-2">
            <SignInButton />
            <Button
              size="sm"
              className="shadow-[0_2px_12px_rgba(20,71,230,0.25)]"
              asChild
            >
              <Link href="/try">
                Try a draft
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
