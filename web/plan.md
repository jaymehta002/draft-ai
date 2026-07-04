# Plan: Separate Home Page from Dashboard

## Current State
- `src/app/page.tsx` handles both unauthenticated (marketing) and authenticated (dashboard) views
- Conditional rendering based on `useSession()` status
- No proper public marketing page

## Goal
- Public marketing home page at `/` (no auth required)
- Authenticated dashboard at `/dashboard` (requires login)
- Clean separation of concerns, with auth enforced at the routing layer, not inside components

## Architectural Decision: Middleware vs Layout Auth

Use **both**, each for what it's good at:

- **`middleware.ts`** — first line of defense. Redirects unauthenticated requests before any React rendering happens (no flash of protected content, no wasted data fetching). Cheap, runs on the edge.
- **`dashboard/layout.tsx`** — server-side session fetch for actually *using* the session data (user id, email) in the dashboard shell, and as a defense-in-depth backstop if middleware config ever drifts.

Relying on `layout.tsx` alone means a logged-out user's request still executes the layout's render path before redirecting — usually fine, but middleware is the standard Next.js pattern for this and avoids edge cases with nested layouts/streaming.

```ts
// src/middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

If you want unauthenticated users redirected straight to sign-in with a return path:

```ts
// src/middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/api/auth/signin",
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

## Implementation Steps

### 0. Decide the logged-in-visits-`/`-behavior (do this first)
Not addressed in the original plan, but it changes the marketing page's code. Pick one:
- **Redirect logged-in users from `/` → `/dashboard` automatically** (common SaaS pattern — no reason to show a marketer their own homepage)
- **Let logged-in users see the marketing page too**, just swap the CTA from "Sign up" to "Go to dashboard"

Recommendation: redirect. Simpler mental model, and it's a light check in `page.tsx` via `getServerSession`.

### 1. Create New Marketing Home Page
**File:** `src/app/page.tsx` (replace current)
- Public-facing landing page, statically rendered where possible (no `useSession` client hook needed if you go with server-side redirect from step 0)
- Hero section with value proposition
- Before/after message comparison (generic vs AI-generated)
- Features overview
- How it works section
- Social proof / stats
- CTA to sign up
- Add `export const metadata` for SEO (title, description, OG image) — this page didn't need SEO before since it was gated; now it does
- If redirecting logged-in users: `const session = await getServerSession(authOptions); if (session) redirect("/dashboard");`

### 2. Move Dashboard to New Route
**File:** `src/app/dashboard/page.tsx` (new)
- Move all current authenticated content from `src/app/page.tsx`
- Keep all dashboard logic:
  - Analytics overview
  - Drafts panel
  - Emails panel
  - DMs panel
  - Profile section
  - Extension integration
- Add `src/app/dashboard/loading.tsx` — a skeleton, so navigation to `/dashboard` doesn't feel like a blank-screen stall while data fetches
- Add `src/app/dashboard/error.tsx` — catch panel-level failures (e.g. one panel's API call failing) without white-screening the whole dashboard
- Add `export const metadata = { robots: { index: false } }` so the dashboard never gets indexed by search engines now that `/` is public and crawlable

### 3. Add Dashboard Layout
**File:** `src/app/dashboard/layout.tsx` (new)
- Server-side session fetch via `getServerSession(authOptions)` (defense-in-depth backstop behind middleware — see architectural note above)
- Redirect to `/api/auth/signin?callbackUrl=/dashboard` if not authenticated
- Wrap dashboard pages with shared shell (sidebar, account menu, etc. currently on the combined page)

### 4. Update Onboarding Redirect
**File:** `src/app/onboarding/page.tsx`
- Change redirect destination from `/` to `/dashboard` after onboarding complete

### 5. Update Extension Connect Page
**File:** `src/app/extension/connect/page.tsx`
- Update any redirects or links that point to `/` to point to `/dashboard`
- **Also audit the extension codebase itself** (popup, background script) for any hardcoded `webUrl + "/"` or similar — the original plan only covers the web app's connect page, but the Chrome extension likely has its own stored base-URL links to the old combined page

### 6. Update Authentication Flow
**Files:** `src/app/api/auth/[...nextauth]/route.ts` (or wherever `authOptions` lives)
- Add a `callbacks.redirect` to send users to `/dashboard` after sign-in by default:
```ts
callbacks: {
  async redirect({ url, baseUrl }) {
    if (url.startsWith("/")) return `${baseUrl}${url}`;
    if (new URL(url).origin === baseUrl) return url;
    return `${baseUrl}/dashboard`;
  },
},
```
- This preserves explicit `callbackUrl` params (e.g. from the middleware redirect in step 0) while defaulting to `/dashboard` otherwise

### 7. Update Navigation Components
**Files to check:**
- `src/components/app-sidebar.tsx` — any "home" link should point to `/dashboard`, not `/`
- `src/components/account-menu.tsx` — sign-out redirect target (`signOut({ callbackUrl: "/" })` is probably correct here — going back to marketing on logout)
- Any breadcrumb or logo-click-to-home components — decide per-context whether "home" means marketing `/` or dashboard `/dashboard`

### 8. Update Static Pages
**File:** `src/app/privacy-policy/page.tsx`
- Add link back to `/` (marketing), since these are typically public pages linked from the marketing footer
- Check if any static pages assumed they'd be reached only by logged-in users (unlikely, but worth a quick check now that `/` no longer requires auth)

### 9. SEO & Crawling (new — not in original plan)
- Add or update `src/app/sitemap.ts` / `sitemap.xml` to include `/` now that it's a real public page
- Add or update `robots.txt` to explicitly disallow `/dashboard`
- Add Open Graph + Twitter card metadata to the marketing page for link previews

### 10. Rollout Order (new — not in original plan)
To avoid a broken deploy window, do this in order rather than all-at-once:
1. Ship `dashboard/page.tsx` + `dashboard/layout.tsx` + middleware first, with `src/app/page.tsx` **still rendering the old combined view** (just also reachable at `/dashboard`). Verify `/dashboard` works end-to-end in prod.
2. Update all redirects (onboarding, auth callback, extension) to point to `/dashboard`.
3. Only once `/dashboard` is confirmed stable, replace `src/app/page.tsx` with the new marketing content.

This way, if something's wrong with the new dashboard route, you haven't simultaneously nuked the only working entry point to the app.

## Files to Create
1. `src/app/dashboard/page.tsx` — move current dashboard logic
2. `src/app/dashboard/layout.tsx` — session fetch + auth redirect
3. `src/app/dashboard/loading.tsx` — loading skeleton
4. `src/app/dashboard/error.tsx` — error boundary
5. `src/middleware.ts` — route-level auth gate
6. `src/app/sitemap.ts` (if not already present)
7. Replace `src/app/page.tsx` — new marketing home page

## Files to Modify
1. `src/app/onboarding/page.tsx` — update redirect
2. `src/app/extension/connect/page.tsx` — update links
3. `src/app/api/auth/[...nextauth]/route.ts` — add `redirect` callback
4. `src/components/app-sidebar.tsx`, `src/components/account-menu.tsx` — nav targets
5. `robots.txt` — disallow `/dashboard`
6. Chrome extension source (popup/background) — audit hardcoded URLs

## Design Notes for Marketing Home Page
- Hero: "Stop sending generic outreach" with before/after message comparison
- Stats: drafts generated, response rate improvement, time saved
- How it works: 3-step process (profile → browse → generate)
- Features: context-aware AI, email integration, analytics, instant generation, privacy, tone control
- CTA: prominent "Get started" button throughout
- Footer: links to features, docs, privacy, etc.

## Testing Checklist
- [ ] `/` shows marketing page without auth, is crawlable, has OG metadata
- [ ] `/dashboard` requires authentication (both direct visit and deep-link to sub-panels if any)
- [ ] Logged-in user visiting `/` gets the decided behavior from Step 0 (redirect or CTA swap)
- [ ] Sign in redirects to `/dashboard` (including when initiated from the middleware's `callbackUrl`)
- [ ] After onboarding, redirects to `/dashboard`
- [ ] Unauthenticated users visiting `/dashboard` redirect to sign-in, then land back on `/dashboard` after auth
- [ ] `/dashboard/loading.tsx` shows during data fetch, `/dashboard/error.tsx` catches panel failures
- [ ] All existing dashboard features (analytics, drafts, emails, DMs, profile, extension integration) work at new route
- [ ] Mobile responsive on both pages
- [ ] Extension connect flow still works, including any hardcoded URLs found in step 5's audit
- [ ] `robots.txt` / sitemap correctly reflect the new public/private split
- [ ] Sign-out from dashboard lands back on marketing `/`, not a 404 or stale session state

## Open Questions (with recommendations)
1. **Separate sign-in UI vs NextAuth default?** — Keep NextAuth's default for now; only build a custom sign-in page if brand consistency on that screen becomes a priority later. Not blocking for this migration.
2. **Extension links pointing to `/`?** — Must audit before shipping (see Step 5); this is the highest-risk unknown since the extension ships independently of the web app's deploy cycle.
3. **"Back to marketing site" link in dashboard?** — Skip it. Dashboard users are already converted; a footer link back to marketing adds clutter without a clear use case. Revisit only if user feedback asks for it.