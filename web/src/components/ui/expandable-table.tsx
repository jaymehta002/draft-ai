"use client"

import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Column<T> = {
  key: string
  header: string
  className?: string
  cell: (item: T) => React.ReactNode
}

type ExpandableTableProps<T extends { id: string }> = {
  columns: Column<T>[]
  data: T[]
  expandedId: string | null
  onToggle: (id: string) => void
  renderExpanded: (item: T) => React.ReactNode
  emptyMessage?: string
}

export function ExpandableTable<T extends { id: string }>({
  columns,
  data,
  expandedId,
  onToggle,
  renderExpanded,
  emptyMessage = "No items found",
}: ExpandableTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/30">
              <th className="w-10 px-4 py-3" />
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item) => {
              const isExpanded = expandedId === item.id
              return (
                <ExpandableRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  isExpanded={isExpanded}
                  onToggle={() => onToggle(item.id)}
                  renderExpanded={renderExpanded}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpandableRow<T extends { id: string }>({
  item,
  columns,
  isExpanded,
  onToggle,
  renderExpanded,
}: {
  item: T
  columns: Column<T>[]
  isExpanded: boolean
  onToggle: () => void
  renderExpanded: (item: T) => React.ReactNode
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-border/40 transition-colors cursor-pointer group",
          isExpanded ? "bg-muted/40" : "hover:bg-muted/20"
        )}
        onClick={onToggle}
      >
        <td className="px-4 py-3.5">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </td>
        {columns.map((col) => (
          <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
            {col.cell(item)}
          </td>
        ))}
      </tr>
      {isExpanded && (
        <tr className="border-b border-border/40 bg-muted/20">
          <td colSpan={columns.length + 1} className="px-4 py-5">
            {renderExpanded(item)}
          </td>
        </tr>
      )}
    </>
  )
}
