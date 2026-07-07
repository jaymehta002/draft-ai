import { FadeIn } from "@/components/motion"
import { getDashboardData, getIntegrationStatus } from "@/app/actions"
import { ExtensionPageClient } from "@/app/dashboard/extension/extension-page-client"

export default async function ExtensionPage() {
  const [dashboard, integrationStatus] = await Promise.all([
    getDashboardData(),
    getIntegrationStatus(),
  ])

  return (
    <FadeIn className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <ExtensionPageClient
        initialApiKey={dashboard?.apiKey ?? null}
        integrationStatus={integrationStatus}
      />
    </FadeIn>
  )
}
