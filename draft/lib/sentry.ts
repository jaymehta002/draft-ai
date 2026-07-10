const dsn = process.env.PLASMO_PUBLIC_SENTRY_DSN

let sentryInitPromise: Promise<void> | null = null

function ensureSentryInit(): Promise<void> {
  if (!dsn) return Promise.resolve()
  if (sentryInitPromise) return sentryInitPromise

  sentryInitPromise = import("@sentry/browser")
    .then((Sentry) => {
      const globalKey = "__sentryExtInit"
      const g = globalThis as unknown as Record<string, boolean>
      if (!g[globalKey]) {
        Sentry.init({ dsn, environment: process.env.NODE_ENV })
        g[globalKey] = true
      }
    })
    .catch(() => {})

  return sentryInitPromise
}

export function captureExtensionError(error: unknown, context?: string) {
  console.error(context ? `[${context}]` : "[extension]", error)
  if (!dsn) return

  void ensureSentryInit()
    .then(() => import("@sentry/browser"))
    .then((Sentry) => Sentry.captureException(error))
    .catch(() => {})
}
