"use client"

import { Search, SlidersHorizontal } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type FilterConfig = {
  search: string
  onSearchChange: (value: string) => void
  sortField: string
  sortDirection: "asc" | "desc"
  onSortFieldChange: (field: string) => void
  onSortDirectionChange: (direction: "asc" | "desc") => void
  sortOptions: { value: string; label: string }[]
  filterSlot?: React.ReactNode
}

type AdaptivePanelProps<T extends { id: string }> = {
  title: string
  description?: string
  items: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  renderListItem: (item: T, selected: boolean) => React.ReactNode
  renderDetail: (item: T) => React.ReactNode
  emptyMessage: string
  filters: FilterConfig
  headerSlot?: React.ReactNode
}

export function AdaptivePanel<T extends { id: string }>({
  title,
  description,
  items,
  selectedId,
  onSelect,
  renderListItem,
  renderDetail,
  emptyMessage,
  filters,
  headerSlot,
}: AdaptivePanelProps<T>) {
  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {headerSlot}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => filters.onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filters.sortField} onValueChange={filters.onSortFieldChange}>
              <SelectTrigger className="h-10 min-w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filters.sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.sortDirection}
              onValueChange={(value) => filters.onSortDirectionChange(value as "asc" | "desc")}
            >
              <SelectTrigger className="h-10 min-w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest</SelectItem>
                <SelectItem value="asc">Oldest</SelectItem>
              </SelectContent>
            </Select>
            {filters.filterSlot}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border p-12">
          <p className="text-sm text-muted-foreground text-center">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_1fr] gap-4 min-h-0">
          <div className="overflow-y-auto rounded-xl border border-border bg-card max-h-[50vh] xl:max-h-none">
            <div className="p-2 space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "w-full text-left rounded-lg p-3 transition-colors",
                    (selectedId === item.id || (!selectedId && item.id === items[0]?.id))
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/60 border border-transparent"
                  )}
                >
                  {renderListItem(item, selectedId === item.id || (!selectedId && item.id === items[0]?.id))}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto rounded-xl border border-border bg-card p-5 min-h-[300px] xl:min-h-0">
            {selected ? (
              renderDetail(selected)
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select an item to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function PanelFilterBadge({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
      <SlidersHorizontal className="h-3 w-3" />
      {label}: {count}
    </span>
  )
}
