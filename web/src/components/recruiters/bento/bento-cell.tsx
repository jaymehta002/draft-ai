import type { BentoCell } from "@/lib/recruiters-content"
import { BentoCellVisual } from "./bento-cell-visual"

const sizeClasses: Record<BentoCell["size"], string> = {
  sm: "col-span-1 row-span-1",
  md: "col-span-1 row-span-1",
  lg: "col-span-1 row-span-2 sm:col-span-2",
  wide: "col-span-1 row-span-1 sm:col-span-2",
}

export function BentoCellWrapper({ cell }: { cell: BentoCell }) {
  return (
    <article className={`bento-cell ${sizeClasses[cell.size]}`}>
      <div className="bento-cell-inner recruit-surface flex h-full flex-col overflow-hidden rounded-2xl p-5 sm:p-6">
        <h3 className="font-serif text-lg text-[var(--recruit-text)] sm:text-xl">
          {cell.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--recruit-muted)]">
          {cell.body}
        </p>
        {cell.examplePrompt && (
          <p className="mt-3 font-mono text-xs text-[#5085fb]/80">
            &ldquo;{cell.examplePrompt}&rdquo;
          </p>
        )}
        <div className="mt-4 flex-1">
          <BentoCellVisual cell={cell} />
        </div>
      </div>
    </article>
  )
}
