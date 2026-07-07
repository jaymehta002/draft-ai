import Link from "next/link"
import { DraftAIBrand } from "@/components/draft-ai-brand"

export function RecruitersFooter() {
  return (
    <footer className="border-t border-[var(--recruit-border)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6 lg:px-8">
        <DraftAIBrand
          subtitle="For Recruiters"
          className="[&_span]:text-[var(--recruit-text)] [&_.text-muted-foreground]:text-[var(--recruit-muted)]"
        />
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--recruit-muted)]">
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
          <Link href="/privacy-policy" className="transition-colors hover:text-[var(--recruit-text)]">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="transition-colors hover:text-[var(--recruit-text)]">
            Terms
          </Link>
        </nav>
      </div>
      <div className="border-t border-[var(--recruit-border)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 text-center text-xs text-[var(--recruit-muted)] sm:px-6 lg:px-8">
          © {new Date().getFullYear()} Draft AI · Enterprise recruiting, reimagined
        </div>
      </div>
    </footer>
  )
}
