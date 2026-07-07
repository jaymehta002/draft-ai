import { BENTO_CELLS } from "@/lib/recruiters-content"
import { SectionHeader } from "@/components/recruiters/section-header"
import { BentoCellWrapper } from "./bento-cell"

export function BentoGrid() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          label="PRODUCT"
          headline="Everything you need to hire faster"
          subheadline="From brief to shortlist — one platform, zero tab-switching."
        />

        <div className="mt-14 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENTO_CELLS.map((cell) => (
            <BentoCellWrapper key={cell.id} cell={cell} />
          ))}
        </div>
      </div>
    </section>
  )
}
