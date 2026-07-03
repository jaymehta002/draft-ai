import { cn } from "@/lib/utils"

export function FormField({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function MonthYearSelect({
  month,
  year,
  onMonthChange,
  onYearChange,
  monthLabel = "Month",
  yearLabel = "Year",
}: {
  month: string
  year: string
  onMonthChange: (v: string) => void
  onYearChange: (v: string) => void
  monthLabel?: string
  yearLabel?: string
}) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => String(currentYear - i))

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label={monthLabel}>
        <select
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="">Month</option>
          {Array.from({ length: 12 }, (_, i) => {
            const m = String(i + 1).padStart(2, "0")
            return (
              <option key={m} value={m}>
                {new Date(2000, i).toLocaleString("en", { month: "short" })}
              </option>
            )
          })}
        </select>
      </FormField>
      <FormField label={yearLabel}>
        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </FormField>
    </div>
  )
}

export function EntryCard({
  title,
  subtitle,
  onRemove,
  canRemove,
  children,
}: {
  title: string
  subtitle?: string
  onRemove?: () => void
  canRemove?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            Remove
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
