import { SectionHeader } from "@/components/recruiters/section-header"
import { BentoGridAnimated } from "./bento-grid.client"

export function BentoGrid() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="PRODUCT"
          headline="Everything you need to hire faster"
          subheadline="From brief to shortlist — one platform, zero tab-switching."
        />

        <div className="mt-14 rounded-2xl border border-slate-100 bg-zinc-50/50 p-4">
          <BentoGridAnimated />
        </div>
      </div>
    </section>
  )
}
