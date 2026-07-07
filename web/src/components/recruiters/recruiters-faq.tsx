import { ChevronDown } from "lucide-react"
import { FAQ_ITEMS } from "@/lib/recruiters-content"
import { SectionHeader } from "@/components/recruiters/section-header"

export function RecruitersFaq() {
  return (
    <section id="faq" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          label="FAQ"
          headline="Questions from hiring teams"
        />

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="recruit-surface group rounded-xl px-5 py-4"
            >
              <summary className="flex items-center justify-between gap-4 font-medium text-[var(--recruit-text)]">
                {item.q}
                <ChevronDown className="faq-chevron size-4 shrink-0 text-[var(--recruit-muted)]" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-[var(--recruit-muted)]">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
