# Draft AI — Web App

AI-powered job seeker outreach: profile setup, Gmail send, analytics dashboard.

## Setup

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Install dependencies and run migrations:

```bash
npm install --legacy-peer-deps
npx prisma migrate deploy
```

3. Start the dev server:

```bash
npm run dev
```

4. Install the Chrome extension from `../draft/` (see `../draft/README.md`).

## Extension connect (local)

Set `PLASMO_PUBLIC_WEB_URL=http://localhost:3000` in `draft/.env` and rebuild the extension.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build + migrations |
| `npm run lint` | ESLint |
| `npm test` | Playwright e2e tests |

## Account lifecycle

- Export data: `GET /api/account/export` (also in Profile → Security)
- Delete account: `DELETE /api/account` with `{ confirmEmail }`
