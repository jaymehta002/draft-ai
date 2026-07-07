# Draft AI — Chrome Extension

## Local development

```bash
cp .env.example .env
# Set PLASMO_PUBLIC_WEB_URL=http://localhost:3000
npm install
npm run dev
```

## Chrome Web Store checklist

Before submitting an update:

- [ ] Screenshots 1280×800: feed Draft button, side panel editor, dashboard analytics
- [ ] Promo tile 440×280
- [ ] 30s demo video (screen recording)
- [ ] Listing copy matches actual capabilities (feed posts, human-in-the-loop send)
- [ ] `assets/icon.svg` matches web brand mark
- [ ] `PLASMO_PUBLIC_WEB_URL` points to production domain in `.env.production`

## Build

```bash
npm run build
npm run package
```
