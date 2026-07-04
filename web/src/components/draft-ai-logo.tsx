import { cn } from "@/lib/utils"

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
  subtitle,
  className,
}: {
  subtitle?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <DraftAILogo />
      <div>
        <p className="text-lg font-semibold tracking-tight text-foreground">Draft AI</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}
