# Draft AI — Development Rules

Conventions for contributors and AI agents working in the `recruit-ai` monorepo.

---

## 1. Repository Structure

| Directory | What goes here |
|-----------|----------------|
| `web/` | Next.js app — all server logic, DB, AI, Gmail, billing, dashboard |
| `draft/` | Plasmo Chrome extension — UI, content scripts, thin API client |
| Root docs | `PRD.md`, `architechture.md`, `rules.md` |

**Do not** add a third package without updating all three root docs.

---

## 2. Where to Put Code

### Server-only logic → `web/src/lib/`
- Database access (Prisma)
- OpenAI calls
- Gmail API
- Billing / entitlements enforcement
- Crypto, token encryption

Mark server-only modules with `import "server-only"` when they must never reach the client or extension.

### API routes → `web/src/app/api/`
- One `route.ts` per endpoint
- Authenticate first: `authenticateBearerRequest()` for extension, `getServerSession()` for web
- Return structured error codes (see `api-errors.ts`)

### Extension-only → `draft/lib/` or `draft/contents/`
- Chrome storage, messaging, DOM injection, offline queue
- No direct OpenAI, Prisma, or env secrets

### Shared pure utilities
- Live in `web/src/lib/` (e.g. `email.ts`, `error-messages.ts`)
- Extension imports via relative path: `../../web/src/lib/email`
- **Must be pure:** no `server-only`, no Node-only APIs, no env secrets

### UI components
- Web: `web/src/components/`
- Extension: `draft/components/`
- Brand mark shared conceptually via `draft-ai-brand` / `draft-ai-logo` — keep visual parity

---

## 3. Authentication Rules

### Extension endpoints
```typescript
const auth = await authenticateBearerRequest(req, { scope: "match-job", limit: 30, windowMs: 3600_000 })
if (auth.error) return auth.error
```

Always check `auth.apiKey.user.candidateProfile?.onboardingComplete` before draft/send operations.

### Web endpoints
Use `getServerSession(authOptions)`. Redirect unauthenticated users in layouts, not scattered in pages.

### Extension connect
- Never issue API keys without a valid, unconsumed `ConnectToken`
- Rotate keys on reconnect; old keys must 401

---

## 4. Billing & Entitlements

- **Single source of truth for limits:** `web/src/lib/plans.ts`
- **Never hardcode** tier prices, draft/email limits, or tone access in components
- **Meter before work:** call `reserveUsage()` before LLM/Gmail; `releaseUsage()` on failure
- **Check feature flags:** `isEnforcementEnabled()` before blocking; allow graceful degradation when enforcement is off
- **Client display:** use `billing-client.ts` / `use-billing-status.ts` — don't duplicate limit math in UI

### Metering semantics
| Action | Meter |
|--------|-------|
| Generate draft (incl. variant, follow-up) | 1 draft |
| Send email | 1 email |
| Copy DM / record outreach | 0 (no meter) |

---

## 5. AI / Draft Generation

- Prompt construction: `web/src/lib/draft-prompt.ts` only — don't inline prompts in route handlers
- Parse LLM output through `parseDraftResult()` / `normalizeDraftResult()`
- Always run `flagSuspiciousDraftOutput()` before persisting
- Cache key: `(userId, postId)` — respect `profileVersion` for invalidation
- Model config: `web/src/lib/openai.ts` — don't instantiate OpenAI elsewhere

---

## 6. Database (Prisma)

- Schema changes require a migration in `web/prisma/migrations/`
- Run `npx prisma migrate dev` locally; production uses `prisma migrate deploy` in build
- Prefer explicit `select` / `include` over fetching full user graphs
- Cascade deletes are configured — don't manual-delete child rows unless necessary
- New enums go in `schema.prisma`, not stringly-typed columns

---

## 7. Extension Conventions

### Message passing
Background script is the only layer that calls the web API. Content scripts and side panel use `chrome.runtime.sendMessage`:

| Message type | Handler |
|--------------|---------|
| `DRAFT_PITCH` | Generate draft for post |
| `SEND_EMAIL` | Send via web API |
| `RECORD_OUTREACH` | Log DM/copy send |

### Storage
- Draft state: per-post map (`draftsByPostId`), not a single global draft
- Clear auth on 401 from `/api/extension/status`
- Persist user edits with debounce (`draft-sync.ts`)

### DOM injection
- Use `dom-query.ts` for shadow DOM — don't assume `document.querySelector` works on X/LinkedIn
- Inject styles into shadow roots via `injectStylesIntoShadowRoots`
- Platform checks via `platform.ts`, not hardcoded hostname strings scattered in files

### UX
- **Human-in-the-loop:** never auto-send email or auto-copy without user click
- Show match score and action mode (EMAIL vs DM) before send
- Offline failures → enqueue, don't silently drop

---

## 8. Web App Conventions

### Next.js
- Read `web/AGENTS.md` — this project uses Next.js 16 with breaking changes vs training data
- Prefer Server Components; add `"use client"` only when needed
- Server actions in `web/src/app/actions/` for form mutations that don't need REST

### Gmail
- Progressive consent: profile at sign-in, Gmail scopes at send/sync
- Use `gmail-consent.ts` and `gmail-scopes.ts` — don't add scopes ad hoc
- Encrypt refresh tokens before storing (`crypto.ts`)

### Onboarding
- Gate extension connect on `onboardingComplete`
- Quick mode vs full mode via `onboarding-steps.ts` / `onboarding-progress.ts`
- Don't skip server-side onboarding checks because the client says it's done

---

## 9. Error Handling

- User-facing copy: `web/src/lib/error-messages.ts` and `draft/lib/error-messages.ts`
- API responses: `{ error: string, code?: string }` with appropriate HTTP status
- Extension maps API codes via `mapApiErrorToExtensionCode()`
- Log server errors with `console.error`; capture unexpected failures in Sentry
- Don't expose stack traces or internal details to clients

---

## 10. Styling & Brand

- Web theme: Tailwind v4, CSS variables in `globals.css` / `theme.css`
- Extension theme: `draft/style.css`, `draft/theme.css` — mirror web tokens
- Brand colors: see `web/brand_assets/colors.md`
- Fonts: Inter (UI) + Merriweather (display) — already configured
- Motion: use `motion-tokens.ts` easing; animate `transform` and `opacity` only — **never `transition-all`**
- Primary brand blue: `#1447e6` — not default Tailwind indigo

---

## 11. Testing

| Type | Location | Command |
|------|----------|---------|
| E2E | `web/e2e/` | `npm test` (Playwright) |
| Unit | `web/src/lib/*.test.ts` | `npm run test:unit` |
| Lint | `web/` | `npm run lint` |

- Add unit tests for pure logic changes in `entitlements-core.ts`, `email.ts`, parsers
- E2E for auth redirects and critical onboarding flows already exist — extend, don't duplicate
- Extension: manual test on X and LinkedIn feeds after DOM changes

---

## 12. Security Checklist

Before shipping auth/billing/email changes:

- [ ] API key hashed at rest (`api-key.ts`)
- [ ] Rate limits on bearer routes (`rate-limit.ts`, `bearer-auth.ts`)
- [ ] Connect token single-use + expiry
- [ ] No secrets in extension bundle (only `PLASMO_PUBLIC_*` vars)
- [ ] Gmail refresh tokens encrypted
- [ ] Webhook signature verification (Dodo / Standard Webhooks)
- [ ] Redirect URLs validated (no open redirects)
- [ ] Account deletion cascades correctly

**Never commit:** `.env`, API keys, Dodo secrets, Google client secrets.

---

## 13. Git & PR Conventions

- **Do not commit** `draft/.env` or `web/.env`
- One logical change per PR when possible
- Update root docs if you change architecture, pricing, or core flows
- Extension version bump in `draft/package.json` before Chrome Web Store submit
- Migration required for any `schema.prisma` change

---

## 14. Agent-Specific Instructions

When an AI agent works in this repo:

1. **Read first:** `PRD.md`, `architechture.md`, and this file before large changes
2. **Minimize scope:** smallest correct diff; don't refactor adjacent code
3. **Match conventions:** read surrounding files before adding new patterns
4. **Don't over-engineer:** no abstractions for one-time operations
5. **Run lint/build** after web changes; rebuild extension after `draft/` changes
6. **Don't commit** unless explicitly asked
7. **Shared imports:** verify extension can import any `web/src/lib` module you touch (no server-only)
8. **Billing changes:** update `plans.ts`, `entitlements-core.ts`, and pricing UI together
9. **DOM changes:** test mentally against X and LinkedIn shadow DOM structures
10. **Human-in-the-loop:** reject any auto-send feature request that bypasses user review

### File touch guide for common tasks

| Task | Primary files |
|------|---------------|
| New API endpoint | `web/src/app/api/.../route.ts`, possibly `web/src/lib/` |
| Draft prompt tuning | `web/src/lib/draft-prompt.ts` |
| Plan limit change | `web/src/lib/plans.ts`, pricing components |
| Feed button behavior | `draft/contents/feed.ts` |
| Send flow | `draft/sidepanel.tsx`, `draft/background.ts`, `web/src/app/api/send-email/route.ts` |
| New DB model | `web/prisma/schema.prisma` + migration |
| Extension auth | `draft/lib/auth.ts`, `web/src/app/api/extension/connect/route.ts` |

---

## 15. Out of Scope (Don't Build Without PRD Update)

- Auto-send / scheduled bulk outreach
- LinkedIn automated DMs
- Mobile native apps
- Recruiter ATS features
- Non-Gmail email providers (unless explicitly scoped)
- Storing LLM API keys in the extension
