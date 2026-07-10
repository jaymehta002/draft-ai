import { validateApiKey } from "@/lib/api-key"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function authenticateBearerRequest(
  req: Request,
  options?: { limit?: number; windowMs?: number; scope?: string }
) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const token = authHeader.split(" ")[1]
  const apiKey = await validateApiKey(token)

  if (!apiKey) {
    return { error: Response.json({ error: "Invalid API key" }, { status: 401 }) }
  }

  if (options?.limit && options?.windowMs) {
    const scope = options.scope ?? "default"
    const result = rateLimit({
      key: `bearer:${scope}:${apiKey.userId}`,
      limit: options.limit,
      windowMs: options.windowMs,
    })
    if (!result.success) {
      return { error: rateLimitResponse(result.resetAt) }
    }
  }

  return { apiKey }
}
