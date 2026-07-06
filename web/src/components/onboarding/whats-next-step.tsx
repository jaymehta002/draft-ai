"use client"

import { motion } from "framer-motion"
import { Check, Circle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const CHROME_STORE_URL = "https://chromewebstore.google.com/detail/draft-ai/dmnbbbdnipckephgdkiaanobhciajilp"

export function WhatsNextStep() {
  const steps = [
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
    {
      title: "Try your first draft",
      body: "Browse X or LinkedIn, click Draft on a post, edit the message, and send or copy.",
    },
  ]

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
        Three quick steps to start thoughtful conversations from your feed.
      </p>

      <ol className="space-y-4 mb-8">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="flex gap-4 rounded-xl border border-border bg-card p-4"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{step.body}</p>
              {step.cta && <div className="mt-2">{step.cta}</div>}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed">
        <p className="flex items-start gap-2">
          <Circle className="size-4 shrink-0 mt-0.5 text-primary" />
          When you send your first email, Draft AI uses your Gmail — you approve every message before it goes out.
        </p>
      </div>

      <Button asChild className="mt-6 gap-2 self-start">
        <Link href="/dashboard?section=extension">
          <Check className="size-4" />
          Open Integrations
        </Link>
      </Button>
    </motion.div>
  )
}
