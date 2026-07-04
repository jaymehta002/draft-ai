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
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-[background-color,color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
        active
          ? "border border-transparent bg-primary text-primary-foreground shadow-sm"
          : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
      {count != null && (
        <span className={cn("tabular-nums", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
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
