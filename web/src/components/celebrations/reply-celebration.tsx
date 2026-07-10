"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import confetti from "canvas-confetti"
import { PartyPopper, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  consumeCelebrationsAction,
  getPendingCelebrationsAction,
} from "@/app/actions/engagement"
import type { Celebration } from "@/lib/engagement"

export function ReplyCelebration() {
  const router = useRouter()
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false

    getPendingCelebrationsAction()
      .then((pending) => {
        if (cancelled || pending.length === 0) return
        setCelebration(pending[0])
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const handleDismiss = async () => {
    setCelebration(null)
    await consumeCelebrationsAction()
  }

  const handleView = async () => {
    const path =
      celebration?.actionMode === "DM" ? "/dashboard/dms" : "/dashboard/emails"
    setCelebration(null)
    await consumeCelebrationsAction()
    router.push(path)
  }

  if (!celebration) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="size-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Someone replied!
            </h2>
            {celebration.recipientName && (
              <p className="text-sm font-medium text-primary">
                {celebration.recipientName}
              </p>
            )}
          </div>
          {celebration.messageExcerpt && (
            <blockquote className="w-full rounded-lg border border-border bg-muted/40 px-4 py-3 text-left text-xs italic text-muted-foreground">
              &ldquo;{celebration.messageExcerpt}&rdquo;
            </blockquote>
          )}
          <div className="flex w-full gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleDismiss}>
              Nice!
            </Button>
            <Button className="flex-1" onClick={handleView}>
              View conversation
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
