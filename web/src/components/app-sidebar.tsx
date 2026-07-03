"use client"

import {
  BarChart3,
  FileText,
  Mail,
  MessageSquare,
  Puzzle,
  User,
  Menu,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type DashboardSection =
  | "analytics"
  | "drafts"
  | "emails"
  | "dms"
  | "profile"
  | "extension"

const NAV_ITEMS: { id: DashboardSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "emails", label: "Emails", icon: Mail },
  { id: "dms", label: "DMs", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: User },
  { id: "extension", label: "Extension", icon: Puzzle },
]

type AppSidebarProps = {
  active: DashboardSection
  onNavigate: (section: DashboardSection) => void
  counts?: Partial<Record<DashboardSection, number>>
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavContent({
  active,
  onNavigate,
  counts,
  onMobileClose,
}: Pick<AppSidebarProps, "active" | "onNavigate" | "counts" | "onMobileClose">) {
  return (
    <>
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground tracking-tight">Draft AI</p>
            <p className="text-[11px] text-sidebar-muted">Outreach</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                onNavigate(id)
                onMobileClose()
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span className="flex-1 text-left">{label}</span>
              {counts?.[id] != null && counts[id]! > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-medium tabular-nums rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center",
                    isActive ? "bg-white/15 text-sidebar-foreground" : "bg-sidebar-accent text-sidebar-muted"
                  )}
                >
                  {counts[id]}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}

export function AppSidebar({ active, onNavigate, counts, mobileOpen, onMobileClose }: AppSidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex lg:w-[220px] lg:flex-col lg:shrink-0 bg-sidebar border-r border-sidebar-border">
        <NavContent active={active} onNavigate={onNavigate} counts={counts} onMobileClose={onMobileClose} />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar flex flex-col shadow-2xl">
            <div className="flex items-center justify-end p-2">
              <Button variant="ghost" size="icon" className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={onMobileClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <NavContent active={active} onNavigate={onNavigate} counts={counts} onMobileClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  )
}
