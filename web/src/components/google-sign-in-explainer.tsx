"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Mail, ShieldCheck, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { requestGmailReadConsent, requestGmailSendConsent } from "@/lib/gmail-consent"

export type GoogleSignInMode = "signin" | "gmail-send" | "gmail-read"

type GoogleSignInExplainerProps = {
  callbackUrl?: string
  mode?: GoogleSignInMode
  trigger: (open: () => void) => React.ReactNode
}

const MODE_COPY: Record<
  GoogleSignInMode,
  { title: string; description: string; bullets: Array<{ icon: typeof User; text: string }> }
> = {
  signin: {
    title: "Sign in with Google",
    description: "Draft AI uses your Google account to sign you in. Gmail access is optional until you send your first email.",
    bullets: [
      { icon: User, text: "Basic profile — your name and email to create your account." },
      { icon: ShieldCheck, text: "We never auto-send, mass-message, or sell your data." },
    ],
  },
  "gmail-send": {
    title: "Connect Gmail to send",
    description: "Draft AI sends emails through your Gmail — you approve every message before it goes out.",
    bullets: [
      { icon: Mail, text: "Gmail send — only emails you review and approve in the extension." },
      { icon: ShieldCheck, text: "We never auto-send or mass-message on your behalf." },
    ],
  },
  "gmail-read": {
    title: "Enable reply tracking",
    description: "Allow inbox read access so Draft AI can detect replies and update your dashboard.",
    bullets: [
      { icon: Mail, text: "Gmail read — sync replies to track conversations in one place." },
      { icon: ShieldCheck, text: "We only read threads related to outreach you sent through Draft AI." },
    ],
  },
}

export function GoogleSignInExplainer({
  callbackUrl = "/onboarding",
  mode = "signin",
  trigger,
}: GoogleSignInExplainerProps) {
  const [open, setOpen] = useState(false)
  const copy = MODE_COPY[mode]

  const handleSignIn = () => {
    setOpen(false)
    if (mode === "gmail-send") {
      requestGmailSendConsent(callbackUrl)
      return
    }
    if (mode === "gmail-read") {
      requestGmailReadConsent(callbackUrl)
      return
    }
    signIn("google", { callbackUrl })
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {copy.bullets.map((item) => (
              <li key={item.text} className="flex gap-3">
                <item.icon className="size-4 shrink-0 mt-0.5 text-primary" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Read our{" "}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              privacy policy
            </Link>{" "}
            for details.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSignIn}>Continue with Google</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
