import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { getDashboardData, getDashboardNavCounts } from "@/app/actions"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Authoritative auth check. The proxy does an optimistic cookie check to
  // avoid a flash of protected content; this validates the session against
  // the database (Prisma adapter) as the real gate.
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/dashboard")
  }

  const [dashboard, counts] = await Promise.all([
    getDashboardData(),
    getDashboardNavCounts(),
  ])
  if (!dashboard?.onboardingComplete) {
    redirect("/onboarding")
  }

  return (
    <DashboardShell
      counts={{
        drafts: counts.drafts,
        emails: counts.emails,
        dms: counts.dms,
      }}
      user={{
        name: dashboard?.candidateProfile?.fullName ?? session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        title: dashboard?.candidateProfile?.currentTitle ?? null,
      }}
    >
      {children}
    </DashboardShell>
  )
}
