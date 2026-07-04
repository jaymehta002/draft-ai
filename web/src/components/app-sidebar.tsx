"use client"

import { useEffect, useState } from "react"
import {
  Gauge,
  PenLine,
  Inbox,
  MessageCircle,
  CircleUserRound,
  Blocks,
  Feather,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftOpen,
  X,
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

const NAV_ITEMS: {
  id: DashboardSection
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>
  description: string
}[] = [
    { id: "analytics", label: "Overview", icon: Gauge, description: "Dashboard analytics" },
    { id: "drafts", label: "Drafts", icon: PenLine, description: "Pending outreach" },
    { id: "emails", label: "Inbox", icon: Inbox, description: "Email pipeline" },
    { id: "dms", label: "Messages", icon: MessageCircle, description: "Direct messages" },
    { id: "profile", label: "Account", icon: CircleUserRound, description: "Your profile" },
    { id: "extension", label: "Integrations", icon: Blocks, description: "Connect apps" },
  ]

// Single shared easing curve so every motion in the sidebar feels like part
// of the same system (collapse, hover, active indicator, tooltips).
const EASE = "cubic-bezier(0.16,1,0.3,1)"

type AppSidebarProps = {
  active: DashboardSection
  onNavigate: (section: DashboardSection) => void
  counts?: Partial<Record<DashboardSection, number>>
  mobileOpen: boolean
  onMobileClose: () => void
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
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent transition-all duration-300" style={{ transitionTimingFunction: EASE }}>
        <Feather className="size-4" strokeWidth={1.75} />
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
          Draft <span className="text-accent">AI</span>
        </p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted/70 mt-1">
          Outreach Studio
        </p>
      </div>
    </div>
  )
}

function NavContent({
  active,
  onNavigate,
  counts,
  onMobileClose,
  collapsed = false,
}: Pick<AppSidebarProps, "active" | "onNavigate" | "counts" | "onMobileClose"> & {
  collapsed?: boolean
}) {

  return (
    <>
      <div
        className={cn(
          "px-3 pt-5 pb-4 transition-all duration-300",
          collapsed && "flex justify-center px-0"
        )}
        style={{ transitionTimingFunction: EASE }}
      >
        <Wordmark collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-1 px-2.5 pb-3">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          const count = counts?.[id]

          return (
            <div key={id} className="group/item relative">
              {/* Active indicator: a soft accent bar that grows/shrinks
                  in from the left edge, instead of popping in/out. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0 top-1/2 z-10 w-[4px] -translate-y-1/2 rounded-full bg-sidebar-accent transition-all duration-300",
                  isActive ? "h-[68%] opacity-100" : "h-0 opacity-0"
                )}
                style={{ transitionTimingFunction: EASE }}
              />

              <button
                type="button"
                onClick={() => {
                  onNavigate(id)
                  onMobileClose()
                }}
                title={collapsed ? label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group/button relative flex w-full items-center overflow-hidden rounded-lg py-2.5 text-sm transition-[background-color,color,box-shadow,transform] duration-200 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                  collapsed ? "justify-center gap-0 px-0" : "gap-3 px-3",
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground active:bg-sidebar-accent active:scale-[0.98] active:duration-75"
                )}
                style={{ transitionTimingFunction: EASE }}
              >
                {/* Darkening fill: sits under the content and ramps up in
                    two steps — a soft tint on hover, a deeper shade on
                    press — so the link reads as something you can push. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit] bg-transparent transition-colors duration-150",
                    !isActive && "group-hover/button:bg-sidebar-foreground/5 group-active/button:bg-sidebar-foreground/10 group-active/button:duration-75"
                  )}
                />

                {/* Hover sheen sweep */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-transparent via-sidebar-foreground/10 to-transparent opacity-0 transition-opacity duration-300",
                    isActive ? "opacity-100" : "group-hover/button:opacity-100"
                  )}
                  style={{ transitionTimingFunction: EASE }}
                />

                <Icon
                  className={cn(
                    "relative z-10 size-4 shrink-0 transition-all duration-200",
                    isActive
                      ? "text-sidebar-accent-foreground scale-105"
                      : "text-sidebar-foreground/60 group-hover/button:text-sidebar-accent-foreground group-hover/button:scale-110"
                  )}
                  strokeWidth={1.75}
                  style={{ transitionTimingFunction: EASE }}
                />

                <span
                  className={cn(
                    "relative z-10 truncate text-left transition-all duration-300",
                    collapsed
                      ? "w-0 opacity-0"
                      : "flex-1 w-auto opacity-100"
                  )}
                  style={{ transitionTimingFunction: EASE }}
                >
                  {label}
                </span>

                {!collapsed && count != null && count > 0 && (
                  <span
                    className={cn(
                      "relative z-10 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums leading-none transition-all duration-200",
                      isActive
                        ? "bg-sidebar-accent-foreground/18 text-sidebar-accent-foreground"
                        : "bg-sidebar-accent/55 text-sidebar-foreground/72 group-hover/button:bg-sidebar-accent-foreground/16"
                    )}
                    style={{ transitionTimingFunction: EASE }}
                  >
                    {count}
                  </span>
                )}
              </button>

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
    </>
  )
}

export function AppSidebar({ active, onNavigate, counts, mobileOpen, onMobileClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (!mobileOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen, onMobileClose])

  const handleCollapse = () => {
    setIsAnimating(true)
    setCollapsed((v) => !v)
    // Match this to the width transition duration below so overflow is
    // only clipped while it's actually needed, then released — this is
    // what keeps hover/tooltip motion smooth right after a collapse.
    window.setTimeout(() => setIsAnimating(false), 350)
  }

  return (
    <>
      {/* Desktop — persistent sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:shrink-0 lg:flex-col lg:h-screen lg:sticky lg:top-0",
          "bg-sidebar border-r border-sidebar-border shadow-sm",
          "transition-[width] duration-350 will-change-[width]",
          collapsed ? "lg:w-[64px]" : "lg:w-[220px]",
          isAnimating && "overflow-hidden"
        )}
        style={{ transitionTimingFunction: EASE, transitionDuration: "350ms" }}
      >
        <NavContent
          active={active}
          onNavigate={onNavigate}
          counts={counts}
          onMobileClose={onMobileClose}
          collapsed={collapsed}
        />

        {/* Desktop collapse button */}
        <div
          className={cn(
            "mt-auto px-2.5 py-3 transition-all duration-300",
            collapsed && "flex justify-center"
          )}
          style={{ transitionTimingFunction: EASE }}
        >
          <button
            onClick={handleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-sidebar-foreground/70 transition-[background-color,color,transform] duration-200 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground active:bg-sidebar-accent active:scale-[0.97] active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed && "w-10 justify-center px-0"
            )}
            style={{ transitionTimingFunction: EASE }}
          >
            <ChevronsLeft
              className={cn(
                "size-4 shrink-0 transition-transform duration-300",
                collapsed && "rotate-180"
              )}
              strokeWidth={1.75}
              style={{ transitionTimingFunction: EASE }}
            />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
              style={{ transitionTimingFunction: EASE }}
            >
              Collapse
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile — overlay sidebar */}
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
            <div className="flex h-full flex-col">
              <NavContent
                active={active}
                onNavigate={onNavigate}
                counts={counts}
                onMobileClose={onMobileClose}
                collapsed={false}
              />
            </div>
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