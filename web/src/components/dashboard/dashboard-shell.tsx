"use client"

import { useState } from "react"
import { ReplyCelebration } from "@/components/celebrations/reply-celebration"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { AppSidebar, MobileMenuButton, type DashboardSection } from "@/components/app-sidebar"
import { AccountMenu } from "@/components/account-menu"
import { UsageBanner } from "@/components/billing/usage-banner"
import { ReferralRedeemer } from "@/components/billing/referral-capture"
import { dashboardPathForSection, dashboardSectionFromPathname } from "@/lib/dashboard-routes"

const SECTION_LABELS: Record<DashboardSection, string> = {
  analytics: "Overview",
  pipeline: "Pipeline",
  drafts: "Drafts",
  templates: "Templates",
  emails: "Inbox",
  dms: "Messages",
  profile: "Account",
  extension: "Integrations",
}

type DashboardShellProps = {
  active?: DashboardSection
  counts: Partial<Record<DashboardSection, number>>
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    title?: string | null
  }
  children: React.ReactNode
}

export function DashboardShell({ active, counts, user, children }: DashboardShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const effectiveActive = active ?? dashboardSectionFromPathname(pathname || "/dashboard")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navigateSection = (next: DashboardSection) => {
    router.push(dashboardPathForSection(next))
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <ReferralRedeemer />
      <AppSidebar
        active={effectiveActive}
        onNavigate={navigateSection}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        counts={counts}
        user={user}
        loading={false}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
            <h1 className="text-sm font-semibold text-foreground">
              {SECTION_LABELS[effectiveActive]}
            </h1>
          </div>
          <AccountMenu
            name={user?.name}
            email={user?.email}
            image={user?.image}
            title={user?.title}
            onNavigate={(s) => {
              if (s === "profile:preferences") router.push("/dashboard/profile?tab=preferences")
              else if (s === "profile:billing") router.push("/dashboard/profile?tab=billing")
              else if (s === "profile") router.push("/dashboard/profile?tab=profile")
              else if (s === "extension") router.push("/dashboard/extension")
              else navigateSection(s as DashboardSection)
            }}
          />
        </header>

        <UsageBanner />

        <main className="flex-1 overflow-auto bg-zinc-50 p-6">
          <ReplyCelebration />
          {children}
        </main>
      </div>
    </div>
  )
}

