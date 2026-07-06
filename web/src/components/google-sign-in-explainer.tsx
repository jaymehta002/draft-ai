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

type GoogleSignInExplainerProps = {
  callbackUrl?: string
  trigger: (open: () => void) => React.ReactNode
}

export function GoogleSignInExplainer({
  callbackUrl = "/onboarding",
  trigger,
}: GoogleSignInExplainerProps) {
  const [open, setOpen] = useState(false)

  const handleSignIn = () => {
    setOpen(false)
    signIn("google", { callbackUrl })
  }

  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in with Google</DialogTitle>
            <DialogDescription>
              Draft AI uses your Google account to sign you in and optionally send outreach emails.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <User className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>Basic profile — your name and email to create your account.</span>
            </li>
            <li className="flex gap-3">
              <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>Gmail send — only emails you review and approve in the extension.</span>
            </li>
            <li className="flex gap-3">
              <Mail className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>Gmail read — track replies in your inbox so conversations stay in one place.</span>
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>We never auto-send, mass-message, or sell your data.</span>
            </li>
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
