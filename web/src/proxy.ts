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

export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name))

  if (!hasSession) {
    const signInUrl = new URL("/api/auth/signin", request.url)
    signInUrl.searchParams.set(
      "callbackUrl",
      request.nextUrl.pathname + request.nextUrl.search
    )
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
}
