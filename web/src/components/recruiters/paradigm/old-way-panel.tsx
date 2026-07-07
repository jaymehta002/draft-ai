import { PARADIGM } from "@/lib/recruiters-content"

export function OldWayPanel() {
  return (
    <div className="recruit-surface overflow-hidden rounded-2xl p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-red-400/80" />
        <span className="size-2 rounded-full bg-amber-400/80" />
        <span className="size-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[var(--recruit-muted)]">
          ats_export_v7.xlsx
        </span>
      </div>
      <h3 className="font-serif text-xl text-[var(--recruit-text)]">
        {PARADIGM.oldWay.title}
      </h3>
      <p className="mt-2 text-sm text-[var(--recruit-muted)]">{PARADIGM.oldWay.body}</p>
      <ul className="mt-5 space-y-2">
        {PARADIGM.oldWay.items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-lg bg-red-500/5 px-3 py-2 text-xs text-[var(--recruit-muted)]"
          >
            <span className="mt-0.5 text-red-400">✕</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
