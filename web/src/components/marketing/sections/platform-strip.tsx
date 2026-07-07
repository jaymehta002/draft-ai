function PlatformTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-100 bg-zinc-50 px-2 py-0.5 font-mono text-[11px] font-medium tracking-tight text-foreground/80">
      {children}
    </span>
  )
}

export function PlatformStrip() {
  return (
    <section className="border-y border-slate-100 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:flex-row sm:gap-4 sm:px-6 lg:px-8">
        <span className="text-sm text-muted-foreground">
          Draft AI lives where you already reach out
        </span>
        <span className="hidden text-muted-foreground/40 sm:inline">·</span>
        <div className="flex items-center gap-2">
          <PlatformTag>X</PlatformTag>
          <PlatformTag>LinkedIn</PlatformTag>
        </div>
      </div>
    </section>
  )
}
