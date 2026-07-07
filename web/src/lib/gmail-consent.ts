"use client"

import { signIn } from "next-auth/react"

const BASE_SCOPE = "openid email profile"
const GMAIL_SEND = "https://www.googleapis.com/auth/gmail.send"
const GMAIL_READONLY = "https://www.googleapis.com/auth/gmail.readonly"

export function requestGmailSendConsent(callbackUrl: string) {
  signIn(
    "google",
    { callbackUrl },
    {
      scope: `${BASE_SCOPE} ${GMAIL_SEND}`,
      prompt: "consent",
      access_type: "offline",
      include_granted_scopes: "true",
    }
  )
}

export function requestGmailReadConsent(callbackUrl: string) {
  signIn(
    "google",
    { callbackUrl },
    {
      scope: `${BASE_SCOPE} ${GMAIL_SEND} ${GMAIL_READONLY}`,
      prompt: "consent",
      access_type: "offline",
      include_granted_scopes: "true",
    }
  )
}
