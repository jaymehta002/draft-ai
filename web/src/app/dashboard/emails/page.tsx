import { FadeIn } from "@/components/motion"
import { getDashboardData, getEmailsData, getIntegrationStatus } from "@/app/actions"
import { EmailsPageClient } from "@/app/dashboard/emails/emails-page-client"

export default async function EmailsPage() {
  const [dashboard, emailsData, integrationStatus] = await Promise.all([
    getDashboardData(),
    getEmailsData(),
    getIntegrationStatus(),
  ])

  const profile = dashboard?.candidateProfile

  return (
    <FadeIn className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {emailsData && (
        <EmailsPageClient
          emails={emailsData.emails}
          gmailMissingReadonly={integrationStatus?.gmailMissingReadonly}
          linkHints={{
            email: null,
            linkedinUrl: profile?.linkedinUrl || null,
            githubUrl: profile?.githubUrl || null,
            portfolioUrl: profile?.portfolioUrl || null,
          }}
        />
      )}
    </FadeIn>
  )
}
