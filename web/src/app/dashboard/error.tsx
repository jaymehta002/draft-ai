"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-4 pt-10 text-center">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" strokeWidth={2} />
            </div>
          </div>
          <div>
            <CardTitle className="font-serif text-2xl tracking-tight">Something went wrong</CardTitle>
            <CardDescription className="mt-2 leading-relaxed">
              We couldn&apos;t load part of your dashboard. This is usually temporary.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-10">
          <Button onClick={reset} size="lg" className="w-full">
            Try again
          </Button>
          <Button variant="ghost" size="lg" className="w-full" asChild>
            <a href="/">Back to home</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
