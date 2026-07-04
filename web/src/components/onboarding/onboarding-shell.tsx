"use client"

import { motion } from "framer-motion"
import { DraftAIBrand } from "@/components/draft-ai-logo"
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
          <DraftAIBrand subtitle="Profile setup" />
        </div>
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">{children}</div>
      </div>

      {footer && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 px-4 py-4 shadow-sm backdrop-blur sm:px-8">
          <div className="max-w-2xl mx-auto">{footer}</div>
        </div>
      )}
    </div>
  )
}
