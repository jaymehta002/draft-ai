import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This app uses NextAuth with the Prisma adapter, i.e. database-backed
// sessions rather than JWTs. There is no decodable token in the cookie, so we
// can't validate the session at the edge — we only do an *optimistic* check
// for the presence of the session cookie here to avoid a flash of protected
// content. The authoritative check happens server-side in dashboard/layout.tsx.
const SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
]

// These routes render per-request based on the session cookie, but Next's
// own default caching headers for dynamic responses ("Cache-Control:
// no-cache, must-revalidate", no "Vary: Cookie") leave room for a
// shared/intermediate cache to treat different sessions as cache-equivalent.
// Setting them here in the proxy survives into the final response, unlike
// setting them via next.config.js headers(), which Next's later rendering
// pipeline overwrites for these routes.
function withNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate")
  response.headers.set("Vary", "Cookie")
  return response
}

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))

  if (!hasSession) {
    const signInUrl = new URL("/api/auth/signin", request.url)
    signInUrl.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search
    )
    return withNoStore(NextResponse.redirect(signInUrl))
  }

  return withNoStore(NextResponse.next())
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
}
