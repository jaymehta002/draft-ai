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
              className="group rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-slate-200 hover:shadow-md"
            >
              <summary className="flex items-center justify-between gap-4 font-medium text-foreground">
                {item.q}
                <ChevronDown className="faq-chevron size-4 shrink-0 text-muted-foreground" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
