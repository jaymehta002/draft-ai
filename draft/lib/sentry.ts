const dsn = process.env.PLASMO_PUBLIC_SENTRY_DSN

export function captureExtensionError(error: unknown, context?: string) {
  console.error(context ? `[${context}]` : "[extension]", error)
  if (!dsn || typeof window === "undefined") return

  void import("@sentry/browser")
    .then((Sentry) => {
      if (!(window as unknown as { __sentryExtInit?: boolean }).__sentryExtInit) {
        Sentry.init({ dsn, environment: process.env.NODE_ENV })
        ;(window as unknown as { __sentryExtInit?: boolean }).__sentryExtInit = true
      }
      Sentry.captureException(error)
    })
    .catch(() => {
      // Sentry optional
    })
}
