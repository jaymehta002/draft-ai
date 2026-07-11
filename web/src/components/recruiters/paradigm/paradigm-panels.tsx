import { PARADIGM } from "@/lib/recruiters-content"

const panelClass =
  "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"

export function OldWayPanel() {
  return (
    <div className={panelClass}>
      <div className="mb-4 flex min-h-5 items-center gap-2">
        <span className="size-2 rounded-full bg-red-400/80" />
        <span className="size-2 rounded-full bg-amber-400/80" />
        <span className="size-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          ats_export_v7.xlsx
        </span>
      </div>
      <h3 className="font-display text-xl text-foreground">{PARADIGM.oldWay.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{PARADIGM.oldWay.body}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {PARADIGM.oldWay.items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-muted-foreground"
          >
            <span className="mt-0.5 text-red-500">✕</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function NewWayPanel() {
  return (
    <div className={panelClass}>
      <div className="mb-4 flex min-h-5 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-primary/80" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
          draft-ai · signal layer
        </span>
      </div>
      <h3 className="font-display text-xl text-foreground">{PARADIGM.newWay.title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{PARADIGM.newWay.body}</p>
      <ul className="mt-5 flex-1 space-y-2">
        {PARADIGM.newWay.items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-lg bg-primary/[0.06] px-3 py-2 text-xs text-foreground"
          >
            <span className="mt-0.5 text-primary">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
