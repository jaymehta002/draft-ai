"use client"

import { motion } from "framer-motion"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function OnboardingShell({
  progress,
  children,
  footer,
  className,
}: {
  progress: number
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-muted">
        <motion.div
          className="h-full bg-foreground"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.25, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>

      <div className={cn("flex-1 flex flex-col px-4 sm:px-8 pt-12 pb-32", className)}>
        <div className="max-w-2xl mx-auto w-full mb-10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Draft AI</p>
              <p className="text-xs text-muted-foreground">Profile setup</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">{children}</div>
      </div>

      {footer && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border/60 bg-card/95 backdrop-blur-xl px-4 sm:px-8 py-4">
          <div className="max-w-2xl mx-auto">{footer}</div>
        </div>
      )}
    </div>
  )
}
