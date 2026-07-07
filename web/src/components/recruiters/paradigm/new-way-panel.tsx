import { PARADIGM } from "@/lib/recruiters-content"

export function NewWayPanel() {
  return (
    <div className="recruit-surface overflow-hidden rounded-2xl border-[#1447e6]/20 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="size-2 rounded-full bg-[#5085fb]/80" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-[#5085fb]">
          draft-ai · signal layer
        </span>
      </div>
      <h3 className="font-serif text-xl text-[var(--recruit-text)]">
        {PARADIGM.newWay.title}
      </h3>
      <p className="mt-2 text-sm text-[var(--recruit-muted)]">{PARADIGM.newWay.body}</p>
      <ul className="mt-5 space-y-2">
        {PARADIGM.newWay.items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-lg bg-[#1447e6]/8 px-3 py-2 text-xs text-[var(--recruit-text)]"
          >
            <span className="mt-0.5 text-[#5085fb]">✓</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
