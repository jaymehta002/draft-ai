import { PARADIGM } from "@/lib/recruiters-content"
import { SectionHeader } from "@/components/recruiters/section-header"
import { OldWayPanel } from "./old-way-panel"
import { NewWayPanel } from "./new-way-panel"
import { ParadigmScroll } from "./paradigm-scroll.client"

export function ParadigmSection() {
  return (
    <section id="product" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label={PARADIGM.label}
          headline={PARADIGM.headline}
          subheadline={PARADIGM.subheadline}
        />

        <div className="mt-16">
          <ParadigmScroll>
            <OldWayPanel />
            <NewWayPanel />
          </ParadigmScroll>
        </div>
      </div>
    </section>
  )
}
