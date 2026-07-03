"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PanelToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  children?: React.ReactNode
  className?: string
}

export function PanelToolbar({
  search,
  onSearchChange,
  placeholder = "Search...",
  children,
  className,
}: PanelToolbarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 bg-card border-border/60 shadow-sm"
        />
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

type FilterPillProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
}

export function FilterPill({ active, onClick, children, count }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all",
        active
          ? "bg-foreground text-background shadow-sm"
          : "bg-card text-muted-foreground border border-border/60 hover:text-foreground hover:border-border"
      )}
    >
      {children}
      {count != null && (
        <span className={cn("tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  )
}

type PanelHeaderProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PanelHeader({ title, description, action }: PanelHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
