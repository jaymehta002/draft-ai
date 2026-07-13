# Draft AI — Project Memory

Persistent context synthesized from **36 Cursor agent sessions** (Jul 3–13, 2026) plus the current codebase. Use this alongside `PRD.md`, `architechture.md`, and `rules.md`.

**Owner:** Jay  
**Repo:** `recruit-ai` (GitHub: `jaymehta002/draft-ai`)  
**Product name:** Draft AI (extension + web)  
**Last updated:** July 13, 2026

---

## 1. What This Product Is

Draft AI helps **job seekers** draft personalized outreach from **X (Twitter) and LinkedIn hiring posts**, review/edit in a **Chrome side panel**, and send via **their own Gmail** (human-in-the-loop — never auto-send).

**Monorepo:**
- `web/` — Next.js 16, React 19, Prisma, PostgreSQL, OpenAI, Gmail, Dodo Payments
- `draft/` — Plasmo MV3 Chrome extension (currently **v0.0.5**)

**Core loop:** Sign up → onboard (resume + profile) → connect extension → click **Draft** on feed post → edit in side panel → send email or copy DM → track in dashboard.

---

## 2. Founder Preferences (Learned Across Sessions)

These recur in user feedback — treat them as product constraints:

| Preference | Detail |
|------------|--------|
| **Human-in-the-loop** | User must approve every send. No auto-send, no bulk spam. |
| **Light, bold UI** | Side panel and web app should feel clean and editorial — not dark, not “AI slop.” |
| **Email is primary** | Side panel centers on compose (recipient, subject, body). Metadata/score chrome was explicitly removed or minimized. |
| **Server-side redirects** | Auth routing must happen in RSC/layouts, not laggy client redirects. User called client-side redirect “unprofessional.” |
| **Actionable errors** | Hates generic “Too many requests” / “Something went wrong.” Wants: what happened + what to do (e.g. “Send limit reached — upgrade or wait”). |
| **Honest integration status** | Onboarding must reflect real extension install + connect state, not static checklist steps. |
| **Minimal scope commits** | User prefers focused changes; don’t refactor unrelated code. |
| **Don’t commit unless asked** | No proactive git commits. |
| **Plans before big changes** | User often asks for a plan first, then “implement the plan” / “proceed with option A/B.” |

---

## 3. Pricing & Billing (Current + History)

### Current tiers (`web/src/lib/plans.ts`)

| Tier | Price | Drafts/mo | Emails/mo | Tones |
|------|-------|-----------|-----------|-------|
| **FREE** | $0 | 10 | 10 | Professional only |
| **BASIC** | $19 | 100 | 1,000 | Professional + Warm |
| **PRO** | $39 | 2,000 (soft) | 10,000 (fair use) | All 4 + variants + insights |

**Metering rule (locked in):** 1 draft generated = 1 draft credit. 1 email sent = 1 email credit. **Sending does NOT also deduct a draft.**

**Top-ups:** +200 emails ($8), +500 ($18), +50 drafts ($5). Basic gets 25% off.

**Provider:** **Dodo Payments** (not Stripe — Stripe not viable in India). Webhooks via Standard Webhooks format.

**Enforcement:** Gated by `BILLING_ENFORCEMENT_ENABLED=true`.

### Billing redesign context (Jul 12 session)

User hit a **critical bug: multiple duplicate Dodo subscriptions** charged on same day (4× Pro subscriptions). Root causes addressed in redesign:
- No duplicate checkout prevention → added `CheckoutIntent` (unique per user)
- No plan-change API → added `/api/billing/change-plan`
- Webhook idempotency → `BillingEvent.id` = provider event ID
- Checkout-return fallback when webhooks fail

**Trial:** User asked to **remove trial period** during redesign. (Roadmap doc may still mention 14-day trial on first send — verify `entitlements.ts` vs user intent.)

**Tone gating (Option B):** Warm on Basic; all tones + variants + insights on Pro only.

---

## 4. Onboarding — Evolution & Pitfalls

### What was built
- AI-assisted onboarding: resume upload → OpenAI extraction → one-question flow for gaps
- **Quick mode** vs full mode (`onboarding-steps.ts`, `buildQuickStepQueue`)
- **Persistent progress** via `CandidateProfile.onboardingProgress` JSON (survives refresh)
- Progressive Gmail consent: profile-only at sign-in, Gmail scopes on first send
- `/try` demo funnel for try-before-signup
- Extension connect gated on `onboardingComplete`

### Bugs user reported (and fixes expected)
1. **`[object Object]` in Education step** — rendering bug in onboarding education UI
2. **“Try your first draft” steps showing when extension already connected** — should show “Congratulations, you’re ready…” instead
3. **Completion blocked by fields never asked in quick onboarding** — Desired roles, salary, work location, availability required at finish but skipped in flow
4. **Draft fails with “Couldn’t build the draft” during partial onboarding** — server requires `onboardingComplete` + valid profile
5. **Refresh skips steps** → fixed with persistent `onboardingProgress`
6. **Extension not detected on whats-next step** → content-script ping (Option A) implemented

### Auth redirect preference
- New account → `/onboarding`
- Returning complete user → `/dashboard` from **server component**, not client hook

---

## 5. Extension — Critical Learnings

### Architecture
- **Background script only** calls web API (Bearer API key)
- Content scripts (`feed.ts`) inject Draft buttons via shadow-DOM-aware `dom-query.ts`
- Side panel = primary editor; popup = auth + stats + weekly goal ring
- Shared pure utils imported from `web/src/lib/` (e.g. `email.ts`) — must stay server-free

### LinkedIn/X injection history
- Early React/HMR content scripts caused `chrome-extension://invalid/` and **context invalidated** errors
- Feed injector moved to stable non-HMR content script
- LinkedIn shadow DOM requires `queryAllDeep` + style injection into shadow roots
- `minimum_chrome_version: "114"` for side panel API

### Side panel UX (user-driven iterations)
- Redesigned multiple times: match score → hover tooltip → **removed entirely** per user request
- Final intent: **email compose only** — recipient, subject, message, send/copy
- States: idle → sending (block inputs) → sent
- Recipient email must be **editable** when extraction is wrong

### Known extension bugs fixed / in progress
| Issue | Cause / fix direction |
|-------|----------------------|
| “Email send unavailable for this draft” after editing | Draft ID / action mode lost on edit; persist edits + preserve EMAIL mode |
| Wrong email extraction (`Addressvibha@...`, `.com.join`, glued labels) | Harden `web/src/lib/email.ts` regex + LLM post-processing |
| Empty draft until side panel opened | Race: popover rendered before storage sync; fixed storage listener timing |
| Click-through on popover send | Stop propagation on popover overlay |
| Published extension not opening | Older Chrome without side panel; need popup fallback + min version |
| `alarms` permission | Used for offline queue retry (5 min) + engagement poll — needs Chrome Web Store justification |

### Chrome Web Store
- Extension version bumped multiple times (0.0.2 → 0.0.3 → … → **0.0.5**)
- Build: `npm run build && npm run package` → `draft/build/chrome-mv3-prod.zip`
- Single purpose: AI-assisted outreach drafts on X/LinkedIn
- Privacy policy + terms pages added on web
- **Not using remote code** — all logic in bundled extension + API calls to user's configured web URL
- Store marketing assets (screenshots, demo video) still pending per roadmap

---

## 6. Email & Resume Handling

### Email extraction rules (hard-won)
- Strip trailing punctuation glued to TLD (`.com.join` → `.com`)
- Strip label prefixes (`Email Address`, `Address`) glued to local part
- Validate before send; user can override in side panel
- Greeting logic: if post author ≠ email recipient name, use recipient name or generic “Hello” — don’t assume wrong name

### Resume attachment
- **UploadThing** for file storage (env: `UPLOADTHING_TOKEN`)
- DB stores metadata + extracted text; PDF attached on send
- **Never attach `.txt` fallback resume** — only real PDF/file
- Schema: `resumeFileUrl`, `resumeStorageKey`, `resumeFileData` (Bytes), etc.

---

## 7. Web App — Major Features Shipped

| Area | Status |
|------|--------|
| Dashboard + sidebar | Shipped; sidebar refined (hover, active state, no press animation) |
| Drafts / Emails / DMs panels | Expandable tables, post links (not raw IDs), filtering hooks |
| Pipeline kanban (CRM-lite) | `ConversationMeta` stages |
| Reply tracking + Gmail sync | History API + thread matcher |
| Streaks, weekly goals, milestones | Phase 2 gamification |
| Winning templates gallery | Industry-tagged |
| Follow-up drafts | Basic+ tier |
| Tone performance insights | Pro tier |
| Referral loop | Bonus draft credits |
| Admin metrics | `/admin` |
| Marketing home (`/`) | Job seeker landing |
| Recruiters landing (`/recruiters`) | Enterprise recruiter page; bento grid redesigned; pricing hidden for now |
| SEO pages | Persona + story routes |
| Account export + deletion | GDPR-style |
| Error message catalog | Centralized in `error-messages.ts` (web + extension) |
| Sentry | Web + extension |

### UI system
- **Clean Slate** shadcn theme via tweakcn
- Fonts: **Inter** (UI) + **Merriweather** (display)
- Primary brand: `#1447e6`
- Tailwind v4 on web; v3 on extension
- Never `transition-all`; animate transform/opacity only
- Page titles moved to top bar, removed from page bodies

---

## 8. Growth Roadmap Status (Jul 2026)

From [million-dollar growth roadmap](.cursor/plans/million-dollar_growth_roadmap_044e2fa0.plan.md):

| Phase | Status |
|-------|--------|
| **P1** Trust & P0 bugs | ✅ Done |
| **P1** Onboarding compression | ✅ Done |
| **P1** Hardening (rate limits, hashed keys, account delete) | ⚠️ Partial — e2e not in CI |
| **P1** Brand & Chrome Store | ⚠️ Partial — store assets missing |
| **P2** Habits (streaks, goals, pipeline) | ✅ Done |
| **P2** Intelligence (templates, follow-ups, CRM) | ✅ Done |
| **P3** Billing (Dodo) | ✅ Done |
| **P3** Growth (referral, SEO, admin) | ⚠️ Partial |
| **P3** Job queue, bootcamp pilot, Firefox | ❌ Not started |

**ARR target math:** ~3,000 paying @ ~$28 ARPU for $1M ARR.

---

## 9. CI / Deployment Gotchas

| Issue | Fix |
|-------|-----|
| `npm ci` lockfile out of sync | Regenerate `web/package-lock.json` and `draft/package-lock.json` |
| Build runs `prisma migrate deploy` | CI needs Postgres service container |
| `ubuntu-latest` is GitHub runner — works even if dev is on macOS |
| Vercel root directory must be `web/` | Not repo root |
| `web/` was nested git repo → removed; push as directory in monorepo |
| Turbopack root wrong → `next-auth` not found | Set `turbopack.root` in `web/next.config.ts` |
| Sentry + Next 16 peer dep conflict on Vercel | Upgraded `@sentry/nextjs` to v10 |
| Plasmo connect.ts dynamic `matches` | Must be static literal at build time |
| Missing icon PNGs for extension build | Generate from `assets/icon.svg` |

**CI env:** Fake inline env vars in workflow — no GitHub secrets needed for lint/build. Real secrets only in local `.env`.

---

## 10. Auth & Security Decisions

- **Web:** NextAuth + Google OAuth (profile scopes at sign-in)
- **Extension:** Hashed API keys (`ApiKey.keyHash`), prefix shown in UI
- **Connect flow:** Short-lived single-use `ConnectToken` prevents CSRF
- **401 on extension status** → clears local auth (key rotation)
- **Rate limits:** Per-route via `bearer-auth.ts` + `rate-limit.ts`
- **Gmail refresh tokens:** AES-256-GCM encrypted in `MailboxSync`
- **Never commit:** `.env`, API keys, Dodo secrets

User asked explicitly about API key security (Jul 11 audit):
- Keys hashed at rest ✅
- Constant-time compare — verify in `api-key.ts`
- Immediate revocation on delete ✅
- Rate limit on failed attempts ✅

---

## 11. Open Issues & Next Work

Priority items surfaced across sessions but not fully closed:

1. **E2E tests in CI** — Playwright exists in `web/e2e/`, not wired to `.github/workflows/ci.yml`
2. **Chrome Web Store assets** — screenshots 1280×800, promo tile, 30s demo video
3. **Side panel send-after-edit bug** — plan created Jul 12; verify fix shipped
4. **Email extraction edge cases** — ongoing (.com punctuation, glued labels)
5. **Error copy for rate limits / send limits** — user still saw generic “Too many requests” after standardization pass
6. **Onboarding education / quick-mode field mismatch** — may need re-verification
7. **Job queue** for async LLM/email at scale
8. **Bootcamp B2B pilot**
9. **Firefox extension publish** (`build:firefox` exists)
10. **Trial period** — user asked to remove; confirm code matches intent

---

## 12. Session Index (Parent Chats)

Quick reference to major Cursor sessions by topic:

| Topic | Session |
|-------|---------|
| Extension ↔ web auth + early MVP | [Extension web auth MVP](96c8d7cf-573f-4078-8a99-c3cdb9cb8db4) |
| AI onboarding + resume extract | [AI onboarding flow](4b3e9fbe-65ad-4ac8-969e-33467731754c) |
| Email parsing + PDF attach | [Email parsing fixes](4c55e29a-3a62-4107-910e-3cf48fb9f498) |
| Dashboard panels + profile editors | [Dashboard profile panels](9e2e02e0-7c0d-416b-a86f-d91ccc0e575a) |
| UI/UX pass (Clean Slate theme) | [Clean Slate UI pass](41dd6478-37f6-4670-ad56-b03592935fa3) |
| Side panel redesign | [Side panel redesign](6ab1342e-bfdc-47d0-9b45-503147bac767) |
| UploadThing resume storage | [UploadThing resumes](6ab1342e-bfdc-47d0-9b45-503147bac767) |
| Million-dollar roadmap | [Growth roadmap plan](b5ab74d8-8105-437f-a77d-5e5881fa80cd) |
| Phase 1 implementation | [Phase 1 foundation](b5ab74d8-8105-437f-a77d-5e5881fa80cd) |
| Phase 2 gamification | [Phase 2 retention](6f55b49e-53c8-4fd4-9661-52fcb67e6574) |
| Phase 3 Dodo billing | [Phase 3 monetization](5d55b3a4-cb2b-4113-853f-f60405819072) |
| Platform/marketing redesign | [Platform redesign](8ac25cc2-9c3a-432c-b59a-721a96178cbc) |
| Recruiter landing page | [Recruiter landing](3592368e-2795-466b-b092-5f5241767445) |
| CI pipeline fixes | [CI pipeline setup](41f9a6a3-8075-4fb9-beac-3fe92c61eb04) |
| Error message standardization | [Error copy standardization](05be2575-25e9-412e-9c56-cdf18b8df834) |
| Published extension debug | [Extension publish debug](bd71f4f1-50a5-4ac0-bd96-00dbc5a20818) |
| Persistent onboarding | [Persistent onboarding](2ede3f85-d476-49f1-b4a4-be4f4373f3c9) |
| Extension detection on onboarding | [Extension detection](3811a351-9a58-483b-bc97-5de0f347dd0e) |
| Onboarding bugs (education, fields) | [Onboarding bug fixes](31bea734-dd5b-4bb0-908b-854e37f1fbf3) |
| Auth/onboarding audit | [Auth onboarding audit](153cd404-20af-45f5-bd31-1fd222cbdb32) |
| Billing redesign (duplicate subs) | [Billing redesign](50e63249-97ba-428c-b904-041a85ce1a1b) |
| Side panel send + email extract | [Side panel send fix](8514d1a0-6765-4f05-b100-a94e16ac78fc) |
| Root docs (PRD/arch/rules) | [Root docs design](f41e41ea-3de7-47d6-b2eb-516200ca73e1) |

---

## 13. Environment Quick Reference

```bash
# Web
cd web && cp .env.example .env && npm install --legacy-peer-deps
npx prisma migrate deploy && npm run dev

# Extension
cd draft && cp .env.example .env
# PLASMO_PUBLIC_WEB_URL=http://localhost:3000
npm install && npm run dev
```

**Critical env vars:** `DATABASE_URL`, `NEXTAUTH_*`, `GOOGLE_*`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`, `DODO_*`, `UPLOADTHING_TOKEN`, `BILLING_ENFORCEMENT_ENABLED`, `PLASMO_PUBLIC_WEB_URL`

---

## 14. Do NOT Do (Hard Constraints)

- Auto-send emails or DMs without explicit user click
- Store OpenAI/Gmail secrets in extension bundle
- Attach `.txt` as resume fallback
- Hardcode plan prices/limits outside `plans.ts`
- Use default Tailwind indigo as primary brand color
- Commit `.env` files
- Refactor unrelated code when fixing a targeted bug
- Add features not in PRD without user confirmation

---

## 15. How to Use This File

**For AI agents:** Read this + `rules.md` at session start. Cross-check decisions here before proposing architecture or pricing changes.

**For humans:** Update this file when a major decision is made in chat (new tier, flow change, resolved bug pattern). Keep it under ~500 lines; archive old decisions to git history rather than deleting context abruptly.

**Related docs:**
- `PRD.md` — product requirements
- `architechture.md` — system design
- `rules.md` — coding conventions
- `.cursor/plans/million-dollar_growth_roadmap_044e2fa0.plan.md` — phased execution tracker
