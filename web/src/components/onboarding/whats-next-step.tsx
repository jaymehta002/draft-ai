"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Check, Circle, ExternalLink, Loader2, PartyPopper } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { CHROME_STORE_URL } from "@/lib/extension-config"
import {
  useExtensionSetupStatus,
  type ExtensionSetupStatus,
} from "@/hooks/use-extension-setup-status"

type StepState = "pending" | "active" | "complete"

function getStepState(index: number, completed: boolean[]): StepState {
  if (completed[index]) return "complete"

  const firstIncomplete = completed.findIndex((done) => !done)
  return firstIncomplete === index ? "active" : "pending"
}

function getStatusLabel(
  index: number,
  state: StepState,
  isPolling: boolean,
  setup: ExtensionSetupStatus
): string | null {
  if (state === "complete") {
    return index === 0 ? "Extension detected" : "Account connected"
  }

  if (state !== "active" || !isPolling) return null

  if (index === 0) return "Waiting for extension..."
  if (setup.extensionKeyIssued && !setup.extensionConnected) {
    return "Code ready — open extension to connect"
  }
  return "Open the extension and tap Connect"
}

/** Install + connect only — "first draft" is not a polling checklist item, it's the outcome shown on CongratulationsView. */
const CHECKLIST = [
  {
    title: "Install the Chrome extension",
    body: "Add Draft AI to Chrome so Draft buttons appear on X and LinkedIn posts.",
    cta: (
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
      >
        Chrome Web Store
        <ExternalLink className="size-3" />
      </a>
    ),
  },
  {
    title: "Connect your account",
    body: "Open the extension popup and tap Connect — we'll link it to your profile.",
  },
]

function CongratulationsView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <span className="mb-6 flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <PartyPopper className="size-7" />
      </span>

      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        You&apos;re all set!
      </h1>
      <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
        Browse X or LinkedIn and click <span className="font-medium text-foreground">Draft</span>{" "}
        on any recruitment post — Draft AI writes a first message for you to review and send.
      </p>

      <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm text-foreground mb-4">
        Your extension is installed and connected to your account.
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
        Need it on another device?{" "}
        <Link href="/dashboard/extension" className="font-medium text-primary hover:underline">
          View integration settings
        </Link>
        .
      </div>
    </motion.div>
  )
}

function ChecklistView({
  status,
}: {
  status: ExtensionSetupStatus
}) {
  const { steps, isPolling } = status
  const completed = [steps.install, steps.connect]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        You&apos;re almost ready
      </h1>
      <p className="text-muted-foreground text-lg mb-8">
        Two quick steps to start thoughtful conversations from your feed.
      </p>

      <ol className="space-y-4 mb-8">
        {CHECKLIST.map((step, i) => {
          const state = getStepState(i, completed)
          const statusLabel = getStatusLabel(i, state, isPolling, status)

          return (
            <li
              key={step.title}
              className={cn(
                "flex gap-4 rounded-xl border bg-card p-4 transition-colors",
                state === "complete" && "border-accent/40 bg-accent/5",
                state === "active" && "border-primary/50 ring-1 ring-primary/20",
                state === "pending" && "border-border"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  state === "complete" && "bg-accent text-accent-foreground",
                  state === "active" && "bg-primary/10 text-primary",
                  state === "pending" && "bg-muted text-muted-foreground"
                )}
              >
                {state === "complete" ? (
                  <Check className="size-4" />
                ) : state === "active" && isPolling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  i + 1
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                {statusLabel && (
                  <p
                    className={cn(
                      "mt-2 text-xs font-medium",
                      state === "complete" ? "text-accent" : "text-primary"
                    )}
                  >
                    {statusLabel}
                  </p>
                )}
                {step.cta && state !== "complete" && <div className="mt-2">{step.cta}</div>}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
        <p className="flex items-start gap-2">
          <Circle className="size-4 shrink-0 mt-0.5 text-primary" />
          When you send your first email, Draft AI uses your Gmail — you approve every message
          before it goes out.
        </p>
      </div>
    </motion.div>
  )
}

export function WhatsNextStep({
  onStatusChange,
}: {
  onStatusChange?: (status: ExtensionSetupStatus) => void
}) {
  const { status } = useExtensionSetupStatus({ enabled: true })

  useEffect(() => {
    onStatusChange?.(status)
  }, [onStatusChange, status])

  const setupComplete = status.steps.install && status.steps.connect

  return setupComplete ? <CongratulationsView /> : <ChecklistView status={status} />
}
