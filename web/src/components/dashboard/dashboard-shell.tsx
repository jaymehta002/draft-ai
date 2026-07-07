"use client"

import { useState } from "react"
import { ReplyCelebration } from "@/components/celebrations/reply-celebration"
import { useRouter } from "next/navigation"
import { usePathname } from "next/navigation"
import { AppSidebar, MobileMenuButton, type DashboardSection } from "@/components/app-sidebar"
import { AccountMenu } from "@/components/account-menu"
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
    <div className="min-h-screen bg-background flex">
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
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-sm backdrop-blur-sm">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
              <h1 className="text-sm font-semibold tracking-tight text-foreground">
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
                else if (s === "profile") router.push("/dashboard/profile?tab=profile")
                else if (s === "extension") router.push("/dashboard/extension")
                else navigateSection(s as DashboardSection)
              }}
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background">
          <ReplyCelebration />
          {children}
        </main>
      </div>
    </div>
  )
}

