"use client"

import { Suspense } from "react"
import { useSession, signIn } from "next-auth/react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Loader2, Plug } from "lucide-react"
import { DraftAIBrand } from "@/components/draft-ai-logo"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FadeIn } from "@/components/motion"

const AUTH_MESSAGE_TYPE = "RECRUIT_PITCH_AUTH"

function ExtensionConnectContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const state = searchParams.get("state")
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!state) {
      setConnectionStatus("error")
      setErrorMessage("Missing connection state. Open this page from the Draft AI extension.")
      return
    }

    if (status === "unauthenticated") {
      signIn("google", { callbackUrl: `/extension/connect?state=${state}` })
      return
    }

    if (status !== "authenticated" || connectionStatus !== "idle") {
      return
    }

    const connect = async () => {
      setConnectionStatus("connecting")

      try {
        const response = await fetch("/api/extension/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to connect extension")
        }

        window.postMessage(
          {
            type: AUTH_MESSAGE_TYPE,
            state: data.state,
            apiKey: data.apiKey,
            email: data.email,
            name: data.name,
          },
          window.location.origin
        )

        setConnectionStatus("success")
      } catch (error) {
        setConnectionStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Failed to connect extension")
      }
    }

    connect()
  }, [state, status, connectionStatus])

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-background to-background flex items-center justify-center p-6">
      <FadeIn className="max-w-md w-full">
        <Card className="shadow-xl shadow-blue-500/5 border-border/60">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <DraftAIBrand />
            </div>
            <CardTitle className="flex items-center justify-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              Connect extension
            </CardTitle>
            <CardDescription>
              Link your Draft AI Chrome extension to this account
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {!state && <p className="text-sm text-destructive">{errorMessage}</p>}

            {state && status === "loading" && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking session...
              </div>
            )}

            {state && status === "unauthenticated" && (
              <p className="text-muted-foreground">Redirecting to sign in...</p>
            )}

            {state && connectionStatus === "connecting" && (
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center justify-center gap-2 text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Linking to {session?.user?.email}...
              </motion.div>
            )}

            {state && connectionStatus === "success" && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-2"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <p className="font-medium text-emerald-700">Extension connected!</p>
                <p className="text-sm text-muted-foreground">
                  Signed in as {session?.user?.email}. Close this tab and return to X or LinkedIn.
                </p>
              </motion.div>
            )}

            {state && connectionStatus === "error" && (
              <>
                <p className="text-sm text-destructive">{errorMessage}</p>
                {errorMessage?.includes("onboarding") && (
                  <Button variant="outline" asChild>
                    <a href="/onboarding">Complete your profile</a>
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}

export default function ExtensionConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <ExtensionConnectContent />
    </Suspense>
  )
}
