"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Gauge,
  Inbox,
  MessageCircle,
  CircleUserRound,
  Blocks,
  ChevronsLeft,
  PanelLeftOpen,
  X,
  LayoutGrid,
  BookOpen,
  FeatherIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { dashboardPathForSection } from "@/lib/dashboard-routes"
import { DraftAIMark } from "@/components/draft-ai-brand"
import { LayoutIndicator } from "@/components/motion"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

export type DashboardSection =
  | "analytics"
  | "pipeline"
  | "drafts"
  | "templates"
  | "emails"
  | "dms"
  | "profile"
  | "extension"

const NAV_ITEMS: {
  id: DashboardSection
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
  description: string
  featured?: boolean
}[] = [
    { id: "analytics", label: "Overview", icon: Gauge, description: "Dashboard analytics" },
    { id: "pipeline", label: "Pipeline", icon: LayoutGrid, description: "Conversation pipeline" },
    { id: "drafts", label: "Drafts", icon: FeatherIcon, description: "Pending outreach" },
    { id: "templates", label: "Templates", icon: BookOpen, description: "Winning messages" },
    { id: "emails", label: "Inbox", icon: Inbox, description: "Email pipeline" },
    { id: "dms", label: "Messages", icon: MessageCircle, description: "Direct messages" },
    { id: "profile", label: "Account", icon: CircleUserRound, description: "Your profile" },
    { id: "extension", label: "Integrations", icon: Blocks, description: "Connect apps" },
  ]

const EASE = "cubic-bezier(0.16,1,0.3,1)"

function getInitials(name?: string | null, email?: string | null) {
  const base = (name || email || "U").trim()
  return base
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

type AppSidebarProps = {
  active: DashboardSection
  onNavigate: (section: DashboardSection) => void
  counts?: Partial<Record<DashboardSection, number>>
  mobileOpen: boolean
  onMobileClose: () => void
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    title?: string | null
  }
  loading?: boolean
}

function Wordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center overflow-hidden transition-all duration-300",
        collapsed ? "gap-0" : "gap-3"
      )}
      style={{ transitionTimingFunction: EASE }}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-primary transition-all duration-300"
        style={{ transitionTimingFunction: EASE }}
      >
        <DraftAIMark className="size-8" />
      </div>
      <div
        className={cn(
          "min-w-0 transition-all duration-300",
          collapsed ? "w-0 -translate-x-4 opacity-0" : "w-auto translate-x-0 opacity-100"
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        <p
          className="truncate text-[13px] font-semibold leading-none tracking-tight text-sidebar-foreground"
          style={{ fontFamily: "var(--font-serif), ui-serif, Georgia, serif" }}
        >
          Draft <span className="text-primary">AI</span>
        </p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted/70 mt-1">
          Outreach Studio
        </p>
      </div>
    </div>
  )
}

function NavBadge({
  count,
  isActive,
  highlight,
}: {
  count: number
  isActive: boolean
  highlight?: boolean
}) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        "relative z-10 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums leading-none transition-all duration-200",
        highlight
          ? isActive
            ? "bg-primary text-primary-foreground"
            : "bg-primary text-primary-foreground "
          : isActive
            ? "bg-sidebar-accent-foreground/18 text-sidebar-accent-foreground"
            : "bg-sidebar-accent/55 text-sidebar-foreground/72 group-hover/button:bg-sidebar-accent-foreground/16"
      )}
      style={{ transitionTimingFunction: EASE }}
    >
      {count}
    </span>
  )
}

function SidebarFooter({
  user,
  loading,
  collapsed,
}: {
  user?: AppSidebarProps["user"]
  loading?: boolean
  collapsed: boolean
}) {
  if (loading) {
    return (
      <div
        className={cn(
          "border-t border-sidebar-border p-3 transition-colors duration-300",
          collapsed ? "flex justify-center" : "space-y-2"
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        {collapsed ? (
          <Skeleton className="size-9 rounded-full" />
        ) : (
          <div className="flex items-center gap-3 px-1">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2.5 w-32 rounded" />
            </div>
          </div>
        )}
      </div>
    )
  }

  const initials = getInitials(user?.name, user?.email)

  return (
    <div
      className={cn(
        "border-t border-sidebar-border p-2 transition-colors duration-300",
        collapsed ? "flex justify-center" : ""
      )}
      style={{ transitionTimingFunction: EASE }}
    >
      <Link
        href="/dashboard/profile"
        className={cn(
          "group/footer flex w-full items-center rounded-lg p-2 transition-[background-color,transform] duration-200 hover:bg-sidebar-accent/70 active:scale-[0.98] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          collapsed ? "justify-center gap-0" : "gap-3"
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        <Avatar className="size-8 shrink-0 border border-sidebar-border ring-2 ring-sidebar-border/30">
          <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "min-w-0 flex-1 text-left transition-[width,opacity] duration-300",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
          style={{ transitionTimingFunction: EASE }}
        >
          <p className="truncate text-xs font-semibold leading-tight text-sidebar-foreground">
            {user?.name || "Account"}
          </p>
          <p className="truncate text-[10px] leading-tight text-sidebar-muted/80 mt-0.5">
            {user?.title || user?.email || "Manage profile"}
          </p>
        </div>
      </Link>
    </div>
  )
}

function NavContent({
  active,
  counts,
  onMobileClose,
  collapsed = false,
  user,
  loading,
}: Pick<AppSidebarProps, "active" | "counts" | "onMobileClose" | "user" | "loading"> & {
  collapsed?: boolean
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "px-3 pt-5 pb-4 transition-all duration-300",
          collapsed && "flex justify-center px-0"
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        <Wordmark collapsed={collapsed} />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2.5 pb-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon, featured }) => {
          const isActive = active === id
          const count = counts?.[id]
          const isInbox = id === "emails"

          return (
            <div key={id} className="group/item relative">
              {isActive && <LayoutIndicator />}

              <Link
                href={dashboardPathForSection(id)}
                onClick={() => onMobileClose()}
                title={collapsed ? label : undefined}
                aria-current={isActive ? "page" : undefined}
                data-active={isActive}
                className={cn(
                  "group/button relative flex w-full items-center overflow-hidden rounded-xl py-2.5 text-sm transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                  collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/[0.06] font-semibold text-primary"
                    : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground active:scale-[0.98] active:duration-75"
                )}
                style={{ transitionTimingFunction: EASE }}
              >
                {/* Hover sheen */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-transparent via-sidebar-foreground/8 to-transparent opacity-0 transition-opacity duration-300",
                    (isActive || featured) && "opacity-100"
                  )}
                  style={{ transitionTimingFunction: EASE }}
                />

                <Icon
                  className={cn(
                    "relative z-10 size-4 shrink-0 transition-[transform,color] duration-200",
                    isActive
                      ? featured
                        ? "text-primary scale-105"
                        : "text-sidebar-accent-foreground scale-105"
                      : featured
                        ? "text-primary/70 group-hover/button:text-primary group-hover/button:scale-110"
                        : "text-sidebar-foreground/55 group-hover/button:text-sidebar-foreground group-hover/button:scale-110"
                  )}
                  strokeWidth={1.75}
                  style={{ transitionTimingFunction: EASE }}
                />

                <span
                  className={cn(
                    "relative z-10 truncate text-left transition-[width,opacity] duration-300",
                    collapsed ? "w-0 opacity-0" : "flex-1 w-auto opacity-100",
                    featured && !isActive && "text-sidebar-foreground/85 font-medium"
                  )}
                  style={{ transitionTimingFunction: EASE }}
                >
                  {label}
                </span>

                {!collapsed && count != null && count > 0 && (
                  <NavBadge count={count} isActive={isActive} highlight={isInbox} />
                )}
              </Link>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div
                  className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100"
                  style={{ transitionTimingFunction: EASE }}
                >
                  <div className="relative rounded-md border border-sidebar-border bg-sidebar/95 px-3 py-2 shadow-lg backdrop-blur-sm">
                    <div className="absolute left-0 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-b border-sidebar-border bg-sidebar/95" />
                    <div className="relative">
                      <p className="text-xs font-medium text-sidebar-foreground">{label}</p>
                      {count != null && count > 0 && (
                        <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">{count} pending</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer user block */}
      <SidebarFooter
        user={user}
        loading={loading}
        collapsed={collapsed}
      />
    </div>
  )
}

export function AppSidebar({ active, onNavigate: _onNavigate, counts, mobileOpen, onMobileClose, user, loading }: AppSidebarProps) {
  void _onNavigate
  const [collapsed, setCollapsed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onMobileClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen, onMobileClose])

  const handleCollapse = () => {
    setIsAnimating(true)
    setCollapsed((v) => !v)
    window.setTimeout(() => setIsAnimating(false), 350)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:shrink-0 lg:flex-col lg:h-screen lg:sticky lg:top-0",
          "border-r border-slate-100 bg-white",
          "transition-[width] will-change-[width]",
          collapsed ? "lg:w-[64px]" : "lg:w-[240px]",
          isAnimating && "overflow-hidden"
        )}
        style={{ transitionTimingFunction: EASE, transitionDuration: "350ms" }}
      >
        <NavContent
          active={active}
          counts={counts}
          onMobileClose={onMobileClose}
          collapsed={collapsed}
          user={user}
          loading={loading}
        />

        {/* Collapse toggle */}
        <div
          className={cn(
            "px-2.5 pb-3 transition-all duration-300",
            collapsed && "flex justify-center"
          )}
          style={{ transitionTimingFunction: EASE }}
        >
          <button
            onClick={handleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/60 transition-[background-color,color,transform] duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground active:bg-sidebar-accent active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed && "w-10 justify-center px-0"
            )}
            style={{ transitionTimingFunction: EASE }}
          >
            <ChevronsLeft
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
              strokeWidth={1.75}
              style={{ transitionTimingFunction: EASE }}
            />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[width,opacity] duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
              style={{ transitionTimingFunction: EASE }}
            >
              Collapse
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/45 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
            onClick={onMobileClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] border-r border-sidebar-border bg-sidebar shadow-xl lg:hidden animate-in slide-in-from-left duration-300 ease-out">
            <div className="absolute right-3 top-3 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={onMobileClose}
                aria-label="Close sidebar"
                className="size-9 rounded-lg transition-[background-color,color,transform] duration-200 hover:bg-sidebar-accent/70 active:bg-sidebar-accent active:scale-90 active:duration-75"
                style={{ transitionTimingFunction: EASE }}
              >
                <X className="size-4" strokeWidth={1.75} />
              </Button>
            </div>
            <NavContent
              active={active}
              counts={counts}
              onMobileClose={onMobileClose}
              collapsed={false}
              user={user}
              loading={loading}
            />
          </aside>
        </>
      )}
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label="Open sidebar"
      className="size-9 rounded-lg transition-[background-color,color,transform] duration-200 hover:bg-accent hover:text-accent-foreground active:bg-accent active:scale-90 active:duration-75 lg:hidden"
      style={{ transitionTimingFunction: EASE }}
    >
      <PanelLeftOpen className="size-4" strokeWidth={1.75} />
    </Button>
  )
}