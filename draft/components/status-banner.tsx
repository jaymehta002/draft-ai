import { AlertCircle, CheckCircle2, Info } from "lucide-react"
import { motion, type Transition } from "framer-motion"
import { cn } from "~lib/utils"

export type StatusTone = "success" | "error" | "info"
export type StatusNote = { tone: StatusTone; text: string }

const TONE_ICON: Record<StatusTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

// Literal class names (not template-interpolated) so Tailwind's JIT content
// scanner can find them — a dynamic `status-banner--${tone}` string doesn't
// match its regex-based scan and gets tree-shaken out of the build.
const TONE_CLASS: Record<StatusTone, string> = {
  success: "status-banner--success",
  error: "status-banner--error",
  info: "status-banner--info",
}

const EASE_SMOOTH: Transition = { duration: 0.18, ease: [0.16, 1, 0.3, 1] }

export function StatusBanner({
  tone,
  children,
  className,
}: {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}) {
  const Icon = TONE_ICON[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={EASE_SMOOTH}
      className={cn("status-banner", TONE_CLASS[tone], "flex items-start gap-2", className)}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </motion.div>
  )
}
