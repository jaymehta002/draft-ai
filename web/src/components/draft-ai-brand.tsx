import Link from "next/link"
import { cn } from "@/lib/utils"

export function DraftAIMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 240"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef5ff" />
        </linearGradient>
        <linearGradient id="foldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2d7ff" />
          <stop offset="100%" stopColor="#b9b0ff" />
        </linearGradient>
        <clipPath id="foldClip">
          <path d="M140,20 L140,54 L174,54 Z" />
        </clipPath>
      </defs>

      {/* Document body with folded top-right corner */}
      <path
        d="
          M30,20
          H140
          L170,50
          V220
          Q170,228 162,228
          H38
          Q30,228 30,220
          V28
          Q30,20 38,20
          Z
        "
        fill="url(#pageGrad)"
        stroke="#7ea8ff"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Folded corner triangle */}
      <path
        d="M140,20 L140,54 L174,54 Z"
        fill="url(#foldGrad)"
        stroke="#7ea8ff"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Fold dot pattern */}
      <g clipPath="url(#foldClip)" opacity="0.95">
        <circle cx="154" cy="30" r="3" fill="#6e63ff" opacity="0.75" />
        <circle cx="164" cy="34" r="3" fill="#6e63ff" opacity="0.65" />
        <circle cx="148" cy="40" r="3" fill="#6e63ff" opacity="0.6" />
        <circle cx="158" cy="44" r="3" fill="#6e63ff" opacity="0.55" />
        <circle cx="170" cy="42" r="3" fill="#6e63ff" opacity="0.5" />
      </g>

      {/* Text lines */}
      <rect x="56" y="84" width="88" height="8" rx="4" fill="#7fa7ea" opacity="0.9" />
      <rect x="56" y="106" width="104" height="8" rx="4" fill="#7fa7ea" opacity="0.9" />
      <rect x="56" y="128" width="72" height="8" rx="4" fill="#7fa7ea" opacity="0.9" />

      {/* Glare/sparkle star at the folded corner */}
      <g transform="translate(160 28)">
        <path
          d="M0,-14 L3,-4 L14,0 L3,4 L0,14 L-3,4 L-14,0 L-3,-4 Z"
          fill="#f4f8ff"
          stroke="#6d8fff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="-10" r="3" fill="#f4f8ff" stroke="#6d8fff" strokeWidth="2" />
      </g>
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
    lg: "size-[32px]",
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center text-primary",
        sizes[size],
        className
      )}
    >
      <DraftAIMark className={iconSizes[size]} />
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
      <DraftAILogo size='lg' /> 
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
