export function SectionHeader({
  label,
  headline,
  subheadline,
  id,
  align = "center",
}: {
  label?: string
  headline: string
  subheadline?: string
  id?: string
  align?: "center" | "left"
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-2xl text-center"
          : "max-w-2xl"
      }
    >
      {label && (
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#5085fb]">
          {label}
        </p>
      )}
      <h2
        id={id}
        className="mt-3 font-serif text-3xl tracking-tight text-[var(--recruit-text)] sm:text-4xl"
      >
        {headline}
      </h2>
      {subheadline && (
        <p className="mt-4 text-base leading-relaxed text-[var(--recruit-muted)] sm:text-lg">
          {subheadline}
        </p>
      )}
    </div>
  )
}
