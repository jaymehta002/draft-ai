import { cn } from "@/lib/utils"
import { coerceSelectYear, getYearOptions } from "@/lib/work-experience-dates"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  const emptyValue = "__empty__"
  const years = getYearOptions()
  const coercedYear = coerceSelectYear(year, years)

  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField label={monthLabel}>
        <Select
          value={month || emptyValue}
          onValueChange={(value) => onMonthChange(value === emptyValue ? "" : value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-60" position="popper">
            <SelectItem value={emptyValue}>Month</SelectItem>
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, "0")
              return (
                <SelectItem key={m} value={m}>
                  {new Date(2000, i).toLocaleString("en", { month: "short" })}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label={yearLabel}>
        <Select
          value={coercedYear || emptyValue}
          onValueChange={(value) => onYearChange(value === emptyValue ? "" : value)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-60" position="popper">
            <SelectItem value={emptyValue}>Year</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            className="shrink-0 text-xs text-muted-foreground transition-colors duration-200 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Remove
          </button>
        )}
      </div>
      {children}
    </div>
  )
}
