"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calendar,
  Menu,
  Sparkles,
  X,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { DraftAIBrand } from "@/components/draft-ai-brand"
import { GoogleSignInExplainer } from "@/components/google-sign-in-explainer"
import { useScrollHeader } from "@/hooks/use-scroll-header"
import { getCalDemoUrl } from "@/lib/cal-demo"
import { EASE_OUT, EASE_SPRING } from "@/lib/motion-tokens"
import { cn } from "@/lib/utils"

const CALLBACK_URL = "/onboarding"

type Audience = "job-seeker" | "recruiter"

type MegaLink = {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  external?: boolean
}

const JOB_SEEKER_LINKS: MegaLink[] = [
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
    description: "Free, Basic, and Pro plans",
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

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group/nav relative rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
    >
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover/nav:scale-x-100"
      />
    </Link>
  )
}

function MegaMenuLink({ link }: { link: MegaLink }) {
  const Icon = link.icon
  const content = (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-transform duration-200 group-hover/link:scale-105">
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
      <div className="w-[520px] rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Job Seekers
            </p>
            <ul className="space-y-1">
              {JOB_SEEKER_LINKS.map((link) => (
                <li key={link.href}>
                  <MegaMenuLink link={link} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              For Teams
            </p>
            <ul className="space-y-1">
              {RECRUITER_LINKS.map((link) => (
                <li key={link.href}>
                  <MegaMenuLink link={link} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

const PILL_OPTIONS: Array<{ audience: Audience; label: string; href: string }> = [
  { audience: "job-seeker", label: "Job Seeker", href: "/" },
  { audience: "recruiter", label: "Recruiter", href: "/recruiters" },
]

function AudiencePill({ audience }: { audience: Audience }) {
  return (
    <div className="relative hidden items-center rounded-full border border-slate-100 bg-zinc-50 p-0.5 sm:flex">
      {PILL_OPTIONS.map((opt) => {
        const active = opt.audience === audience
        return (
          <Link
            key={opt.audience}
            href={opt.href}
            className={cn(
              "relative z-10 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="audience-pill-indicator"
                className="absolute inset-0 -z-10 rounded-full bg-primary"
                transition={EASE_SPRING}
              />
            )}
            {opt.label}
          </Link>
        )
      })}
    </div>
  )
}

function JobSeekerCta() {
  return (
    <>
      <GoogleSignInExplainer
        callbackUrl={CALLBACK_URL}
        trigger={(open) => (
          <Button onClick={open} variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </Button>
        )}
      />
      <GoogleSignInExplainer
        callbackUrl={CALLBACK_URL}
        trigger={(open) => (
          <Button onClick={open} size="sm" className="active:scale-[0.97]">
            Get started
          </Button>
        )}
      />
    </>
  )
}

function RecruiterCta() {
  const demoUrl = getCalDemoUrl()
  return (
    <Button size="sm" className="active:scale-[0.97]" asChild>
      <a href={demoUrl} target="_blank" rel="noopener noreferrer">
        Book a demo
      </a>
    </Button>
  )
}

function MobileMenu({
  audience,
  open,
  onClose,
}: {
  audience: Audience
  open: boolean
  onClose: () => void
}) {
  const isRecruiter = audience === "recruiter"

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="overflow-hidden border-b border-slate-100 bg-white lg:hidden"
        >
          <div className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            <div className="mb-2 flex items-center rounded-full border border-slate-100 bg-zinc-50 p-0.5">
              {PILL_OPTIONS.map((opt) => (
                <Link
                  key={opt.audience}
                  href={opt.href}
                  onClick={onClose}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-center text-sm font-medium transition-colors duration-200",
                    opt.audience === audience
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            {(isRecruiter ? RECRUITER_LINKS : JOB_SEEKER_LINKS).map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-zinc-50"
                >
                  {link.title}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-zinc-50"
                >
                  {link.title}
                </Link>
              )
            )}
            {isRecruiter ? (
              <>
                <Link
                  href="/recruiters#pricing"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-zinc-50"
                >
                  Pricing
                </Link>
                <Link
                  href="/recruiters#faq"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-zinc-50"
                >
                  FAQ
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-zinc-50"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  onClick={onClose}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors duration-200 hover:bg-zinc-50"
                >
                  Pricing
                </Link>
              </>
            )}

            {!isRecruiter && (
              <GoogleSignInExplainer
                callbackUrl={CALLBACK_URL}
                trigger={(open) => (
                  <Button
                    onClick={() => {
                      onClose()
                      open()
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                  >
                    Sign in
                  </Button>
                )}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

type SiteHeaderProps = {
  audience?: Audience
  /** @deprecated use `audience` — kept for existing call sites */
  subtitle?: string
  minimal?: boolean
}

export function SiteHeader({ audience, subtitle, minimal = false }: SiteHeaderProps) {
  const { scrolled, hidden } = useScrollHeader()
  const pathname = usePathname()
  const resolvedAudience: Audience =
    audience ?? (pathname?.startsWith("/recruiters") ? "recruiter" : "job-seeker")
  const resolvedSubtitle = subtitle ?? (resolvedAudience === "recruiter" ? "For Recruiters" : "Outreach Studio")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setMobileOpen(false)
  }

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
            "mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8",
            "transition-[height] duration-300 data-[compact=true]:h-14"
          )}
        >
          <div className="flex items-center gap-4">
            <DraftAIBrand subtitle={resolvedSubtitle} href="/" />
            {!minimal && <AudiencePill audience={resolvedAudience} />}
          </div>

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
              {resolvedAudience === "recruiter" ? (
                <>
                  <NavLink href="/recruiters#pricing">Pricing</NavLink>
                  <NavLink href="/recruiters#faq">FAQ</NavLink>
                </>
              ) : (
                <>
                  <NavLink href="/#features">Features</NavLink>
                  <NavLink href="/pricing">Pricing</NavLink>
                </>
              )}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {resolvedAudience === "recruiter" ? <RecruiterCta /> : <JobSeekerCta />}
            {!minimal && (
              <button
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors duration-200 hover:bg-zinc-50 lg:hidden"
              >
                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            )}
          </div>
        </div>
        {!minimal && (
          <MobileMenu audience={resolvedAudience} open={mobileOpen} onClose={() => setMobileOpen(false)} />
        )}
      </header>
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
