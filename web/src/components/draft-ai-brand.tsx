import Link from "next/link"
import { Feather } from "lucide-react"
import { cn } from "@/lib/utils"

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
      <Feather className={iconSizes[size]} strokeWidth={1.75} />
    </span>
  )
}

export function DraftAIBrand({
  subtitle,
  className,
  variant = "full",
  href,
}: {
  subtitle?: string
  className?: string
  variant?: "full" | "compact" | "monogram"
  href?: string
}) {
  const content = (
    <>
      <DraftAILogo size={variant === "compact" ? "sm" : "md"} />
      {variant !== "monogram" && (
        <span className="leading-none">
          <span className="block font-serif text-[15px] font-semibold tracking-tight text-foreground">
            Draft <span className="text-primary">AI</span>
          </span>
          {subtitle && variant === "full" && (
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </>
  )

  const wrapperClass = cn(
    "group flex items-center gap-3",
    href && "transition-opacity hover:opacity-90",
    className
  )

  if (href) {
    return (
      <Link href={href} className={wrapperClass} aria-label="Draft AI home">
        {content}
      </Link>
    )
  }

  return <div className={wrapperClass}>{content}</div>
}
