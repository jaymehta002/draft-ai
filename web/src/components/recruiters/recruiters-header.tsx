import Link from "next/link"
import { DraftAIBrand } from "@/components/draft-ai-brand"
import { getCalDemoUrl } from "@/lib/cal-demo"

export function RecruitersHeader() {
  const demoUrl = getCalDemoUrl()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--recruit-border)] bg-[var(--recruit-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <DraftAIBrand
          href="/recruiters"
          subtitle="For Recruiters"
          className="[&_span]:text-[var(--recruit-text)] [&_.text-muted-foreground]:text-[var(--recruit-muted)]"
        />

        <nav className="hidden items-center gap-6 text-sm text-[var(--recruit-muted)] md:flex">
          <a href="#product" className="transition-colors hover:text-[var(--recruit-text)]">
            Product
          </a>
          <a href="#pricing" className="transition-colors hover:text-[var(--recruit-text)]">
            Pricing
          </a>
          <a href="#faq" className="transition-colors hover:text-[var(--recruit-text)]">
            FAQ
          </a>
          <Link href="/" className="transition-colors hover:text-[var(--recruit-text)]">
            Job seeker?
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="recruit-cta-primary hidden rounded-lg px-4 py-2 text-sm font-semibold sm:inline-flex"
          >
            Book a demo
          </a>
        </div>
      </div>
    </header>
  )
}
