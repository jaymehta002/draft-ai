import { PARADIGM } from "@/lib/recruiters-content"
import { SectionHeader } from "@/components/recruiters/section-header"
import { OldWayPanel, NewWayPanel } from "./paradigm-panels"
import { ParadigmPanels } from "./paradigm-panels.client"

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
          <ParadigmPanels>
            <OldWayPanel />
            <NewWayPanel />
          </ParadigmPanels>
        </div>
      </div>
    </section>
  )
}
