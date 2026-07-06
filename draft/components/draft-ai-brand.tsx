import { cn } from "~lib/utils"

export function DraftAILogo({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-border bg-accent font-bold text-accent-foreground shadow-sm",
        sizes[size],
        className
      )}
    >
      DA
    </div>
  )
}

export function DraftAIBrand({
  subtitle = "Outreach Studio",
  className,
  titleClassName,
  showSyncIndicator = false,
}: {
  subtitle?: string
  className?: string
  titleClassName?: string
  showSyncIndicator?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <DraftAILogo size="sm" />
      <div>
        <p className={cn("text-base font-semibold tracking-tight text-foreground flex items-center gap-2", titleClassName)}>
          <span className="font-serif">Draft AI</span>
          {showSyncIndicator && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
              aria-hidden="true"
              title="Syncing"
            />
          )}
        </p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
