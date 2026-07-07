const LOCALE = "en-US"

/** Stable locale for SSR/client hydration (avoid `undefined` default locale). */
export function formatDateTime(iso: string, options?: { year?: boolean }) {
  return new Date(iso).toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    ...(options?.year ? { year: "numeric" as const } : {}),
    hour: "numeric",
    minute: "2-digit",
  })
}
