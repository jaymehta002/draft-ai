type RateLimitEntry = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string
  limit: number
  windowMs: number
}): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    buckets.set(key, { count: 1, resetAt })
    return { success: true, remaining: limit - 1, resetAt }
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count += 1
  buckets.set(key, existing)
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  return new Response(
    JSON.stringify({
      error: "Too many requests. Please try again later.",
      code: "rate_limited",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  )
}
