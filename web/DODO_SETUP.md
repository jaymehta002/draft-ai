# Dodo Payments setup — Basic/Pro redesign

Steps to perform in the [Dodo dashboard](https://app.dodopayments.com) (test mode first) before the new
Free/Basic/Pro billing system can be exercised end-to-end. The env var names below are exactly what
`web/src/lib/dodo.ts` and `web/src/lib/plans.ts` read — get the names right and everything else just works.

Do this in **test_mode** first, verify the checklist at the bottom, then repeat in **live_mode** when ready to ship.

---

## 1. Subscription products (recurring)

Create two recurring products under Products → New Product:


| Product | Price  | Billing interval | Env var to set            |
| ------- | ------ | ---------------- | ------------------------- |
| Basic   | $19.00 | Monthly          | `DODO_PLAN_BASIC_MONTHLY` |
| Pro     | $39.00 | Monthly          | `DODO_PLAN_PRO_MONTHLY`   |


**Important:** your existing `DODO_PLAN_PRO_MONTHLY` product is currently priced at **$20**, not $39.
Either:

- edit that product's price to $39 and keep reusing the same product ID, **or**
- create a brand-new $39 product and swap the env var to its new ID (cleaner — avoids any ambiguity for
customers who already look at old $20 receipts).

Either way, copy the resulting `product_id` (looks like `pdt_...`) into `DODO_PLAN_BASIC_MONTHLY` /
`DODO_PLAN_PRO_MONTHLY`.

You can archive/deactivate the old `DODO_PLAN_POWER_MONTHLY` product — the app no longer references it,
Power tier is gone.

## 2. Top-up products (one-time)

Create six one-time-payment products. Each pack has a standard SKU and a **Basic-tier discounted SKU**
(25% off) — the app picks whichever one applies based on the buyer's current tier
(`web/src/lib/plans.ts` → `TOPUP_PACKS`).


| Product                         | Price  | Grants      | Env var                             |
| ------------------------------- | ------ | ----------- | ----------------------------------- |
| Email pack 200 (standard)       | $8.00  | +200 emails | `DODO_PRODUCT_EMAIL_PACK_200`       |
| Email pack 200 (Basic, 25% off) | $6.00  | +200 emails | `DODO_PRODUCT_EMAIL_PACK_200_BASIC` |
| Email pack 500 (standard)       | $18.00 | +500 emails | `DODO_PRODUCT_EMAIL_PACK_500`       |
| Email pack 500 (Basic, 25% off) | $13.50 | +500 emails | `DODO_PRODUCT_EMAIL_PACK_500_BASIC` |
| Draft pack 50 (standard)        | $5.00  | +50 drafts  | `DODO_PRODUCT_DRAFT_PACK_50`        |
| Draft pack 50 (Basic, 25% off)  | $3.75  | +50 drafts  | `DODO_PRODUCT_DRAFT_PACK_50_BASIC`  |


The credit amounts (200/500/50) are enforced by the app, not Dodo — Dodo just needs the right *price*.
If you rename/retire a pack later, update `TOPUP_PACKS` in `web/src/lib/plans.ts` to match.

You can archive/deactivate the old `DODO_PRODUCT_EMAIL_PACK` product ($5, +50/+50) — replaced by the packs above.

## 3. Webhook endpoint

Developer → Webhooks → Add endpoint:

- **URL**: `https://<your-app-domain>/api/billing/webhook`
- **Events to subscribe to** (all of these — the app now handles every one):
  - `subscription.active`
  - `subscription.renewed`
  - `subscription.cancelled`
  - `subscription.plan_changed`
  - `subscription.on_hold`
  - `subscription.failed` (if Dodo exposes it separately from on_hold in your account)
  - `payment.succeeded`
  - `payment.failed`
  - `refund.succeeded`

Copy the **signing secret** (starts `whsec_` or is a base64 string — not a custom label) into
`DODO_WEBHOOK_SECRET`.

## 4. Update `.env`

Your current `.env` still has the **old** var names, which the code no longer reads at all:

```diff
- DODO_PLAN_POWER_MONTHLY=...
- DODO_PRODUCT_EMAIL_PACK=...
+ DODO_PLAN_BASIC_MONTHLY=pdt_...
+ DODO_PRODUCT_EMAIL_PACK_200=pdt_...
+ DODO_PRODUCT_EMAIL_PACK_200_BASIC=pdt_...
+ DODO_PRODUCT_EMAIL_PACK_500=pdt_...
+ DODO_PRODUCT_EMAIL_PACK_500_BASIC=pdt_...
+ DODO_PRODUCT_DRAFT_PACK_50=pdt_...
+ DODO_PRODUCT_DRAFT_PACK_50_BASIC=pdt_...
```

`DODO_PLAN_PRO_MONTHLY` keeps its var name — just repoint the product ID per step 1 if you created a new $39 product.

`DODO_API_KEY`, `DODO_ENVIRONMENT`, and `DODO_WEBHOOK_SECRET` you likely already have set; just confirm
`DODO_WEBHOOK_SECRET` matches the endpoint you created in step 3.

See `web/.env.example` for the full reference block with comments.

## 5. Pre-launch verification checklist

Run through this in test_mode with a Dodo test card before flipping to live_mode:

- [ ] Subscribe to Basic from `/pricing` → billing tab shows **Basic**, correct usage caps (100 drafts / 1,000 emails)
- [ ] Upgrade Basic → Pro from the billing tab → confirm this calls `/api/billing/change-plan` (network tab), **not** a new checkout — and in the Dodo dashboard, confirm there is still only **one** subscription for that customer, now on the Pro product
- [ ] Downgrade Pro → Basic → billing tab shows "Switching to Basic on date" banner; confirm in Dodo the subscription shows a scheduled plan change, not an immediate one
- [ ] Click "Subscribe" twice rapidly (or open two tabs) → second request should get a 409 `checkout_in_progress`, not a second Dodo checkout session
- [ ] Buy a top-up pack as a Basic-tier user → confirm the **discounted** SKU is charged, and the right credit amount lands in the usage meter
- [ ] Trigger a webhook resend/replay for the same event twice (Dodo dashboard lets you resend) → confirm credits/state aren't double-applied
- [ ] Free user: tone step during onboarding shows only Professional unlocked; Basic shows Professional + Warm; Pro shows all four
- [ ] Free/Basic user: "Try another tone" (variant) button doesn't appear in the extension side panel; Pro user sees all remaining tones
- [ ] Pro user: dashboard tone-performance chart shows real data; Free/Basic shows the locked upsell card
- [ ] Cancel a subscription via "Manage billing" (Dodo customer portal) → webhook fires → billing tab reflects `cancelAtPeriodEnd`
- [ ] Set `BILLING_ENFORCEMENT_ENABLED=true` once everything above passes, so limits are actually enforced (it's a staged rollout flag — currently entitlement checks pass regardless of tier until this is `"true"`)



## 6. Going live

Repeat steps 1–3 in live_mode (Dodo requires separate live-mode products — test-mode product IDs won't
work), set `DODO_ENVIRONMENT=live_mode`, swap all the `DODO_*` env vars to the live-mode IDs/secret, and
re-run the checklist above with a real card before announcing the new pricing.