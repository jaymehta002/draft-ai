"use client"

import { Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function AiField({
  aiFilled,
  children,
  className,
}: {
  aiFilled?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      {aiFilled && (
        <div className="absolute -top-6 right-0 flex items-center gap-1 text-xs text-primary">
          <Sparkles className="h-3 w-3" />
          <span>From resume</span>
        </div>
      )}
      <div
        className={cn(
          aiFilled && "ring-1 ring-primary/30 bg-primary/5 rounded-lg"
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function AiInput({
  aiFilled,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { aiFilled?: boolean }) {
  return (
    <AiField aiFilled={aiFilled}>
      <Input className={cn("h-12 text-base", className)} {...props} />
    </AiField>
  )
}

export function AiTextarea({
  aiFilled,
  className,
  ...props
}: React.ComponentProps<typeof Textarea> & { aiFilled?: boolean }) {
  return (
    <AiField aiFilled={aiFilled}>
      <Textarea className={cn("min-h-32 text-base", className)} {...props} />
    </AiField>
  )
}
