type SentryModule = {
  captureException: (error: unknown) => string
  init?: (options: { dsn: string; environment?: string }) => void
}

let sentryClient: SentryModule | null = null
let initAttempted = false

async function getSentry(): Promise<SentryModule | null> {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return null
  if (sentryClient) return sentryClient
  if (initAttempted) return null
  initAttempted = true

  try {
    const Sentry = await import("@sentry/nextjs")
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
    if (dsn && Sentry.init) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      })
    }
    sentryClient = Sentry
    return sentryClient
  } catch {
    return null
  }
}

export async function captureException(error: unknown) {
  const sentry = await getSentry()
  if (sentry) {
    sentry.captureException(error)
  }
}

export function captureExceptionSync(error: unknown) {
  void captureException(error)
}
