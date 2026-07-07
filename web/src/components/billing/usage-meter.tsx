import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type UsageMeterProps = {
  label: string
  used: number
  limit: number
  className?: string
}

/** A single labelled usage bar that turns amber at 80% and red at 100%. */
export function UsageMeter({ label, used, limit, className }: UsageMeterProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const remaining = Math.max(0, limit - used)
  const tone =
    pct >= 100 ? "text-destructive" : pct >= 80 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"
  const barTone =
    pct >= 100
      ? "[&>div]:bg-destructive"
      : pct >= 80
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-primary"

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("tabular-nums", tone)}>
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <Progress value={pct} className={cn("h-2", barTone)} />
      <p className="text-xs text-muted-foreground">
        {remaining > 0 ? `${remaining.toLocaleString()} left this period` : "Limit reached"}
      </p>
    </div>
  )
}
