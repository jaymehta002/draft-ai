export type SortDirection = "asc" | "desc"

export type SortOption = {
  field: string
  direction: SortDirection
}

export function filterBySearch<T extends { recipientName?: string | null; recipientEmail?: string | null; subject?: string | null; message?: string }>(
  items: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items

  return items.filter((item) => {
    const haystack = [
      item.recipientName,
      item.recipientEmail,
      item.subject,
      item.message,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(q)
  })
}

export function sortByField<T extends Record<string, unknown>>(
  items: T[],
  field: string,
  direction: SortDirection
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field]
    const bVal = b[field]

    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    let cmp = 0
    if (typeof aVal === "string" && typeof bVal === "string") {
      cmp = aVal.localeCompare(bVal)
    } else if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal
    } else {
      cmp = String(aVal).localeCompare(String(bVal))
    }

    return direction === "asc" ? cmp : -cmp
  })
}
