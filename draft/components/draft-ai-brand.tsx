import { cn } from "~lib/utils"

function FeatherMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <line x1="16" y1="8" x2="2" y2="22" />
      <line x1="17.5" y1="15" x2="9" y2="15" />
    </svg>
  )
}

export function DraftAILogo({
  className,
  size = "md",
}: {
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const sizes = {
    sm: "size-8 rounded-lg",
    md: "size-9 rounded-lg",
    lg: "size-11 rounded-xl",
  }
  const iconSizes = {
    sm: "size-[14px]",
    md: "size-[18px]",
    lg: "size-[22px]",
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary/10 text-primary",
        sizes[size],
        className
      )}
    >
      <FeatherMark className={iconSizes[size]} />
    </span>
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
        <p
          className={cn(
            "text-base font-semibold tracking-tight text-foreground flex items-center gap-2",
            titleClassName
          )}
        >
          <span className="font-serif">
            Draft <span className="text-primary">AI</span>
          </span>
          {showSyncIndicator && (
            <span
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
              aria-hidden="true"
              title="Syncing"
            />
          )}
        </p>
        {subtitle && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
