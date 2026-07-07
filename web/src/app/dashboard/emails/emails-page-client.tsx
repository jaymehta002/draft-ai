"use client"

import { useRouter } from "next/navigation"
import type { EmailLinkHints } from "@/lib/email-body-format"
import { EmailsPanel } from "@/components/panels/emails-panel"
import type { getEmailsData } from "@/app/actions"

export function EmailsPageClient({
  emails,
  gmailMissingReadonly,
  linkHints,
}: {
  emails: Awaited<ReturnType<typeof getEmailsData>>["emails"]
  gmailMissingReadonly?: boolean
  linkHints?: EmailLinkHints
}) {
  const router = useRouter()
  return (
    <EmailsPanel
      emails={emails}
      gmailMissingReadonly={gmailMissingReadonly}
      linkHints={linkHints}
      onRefresh={() => router.refresh()}
    />
  )
}

