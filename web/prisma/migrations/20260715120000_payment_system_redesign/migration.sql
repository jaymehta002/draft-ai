-- Data cleanup (must run before the enum/column drops below).
-- The only TRIALING rows in this environment are the `trial_<userId>` placeholder
-- subscriptions created by the now-removed startProTrial() flow — they have no real
-- Dodo customer/subscription behind them, so deleting them just returns those users
-- to the FREE tier (resolveEffectiveTier's null-subscription branch), matching the
-- "trials no longer exist" behavior everywhere else in this release.
DELETE FROM "Subscription" WHERE "status" = 'TRIALING';

-- PlanTier: drop POWER, add BASIC
CREATE TYPE "PlanTier_new" AS ENUM ('FREE', 'BASIC', 'PRO');
ALTER TABLE "Subscription" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "tier" TYPE "PlanTier_new" USING ("tier"::text::"PlanTier_new");
ALTER TABLE "Subscription" ALTER COLUMN "tier" SET DEFAULT 'FREE';
ALTER TYPE "PlanTier" RENAME TO "PlanTier_old";
ALTER TYPE "PlanTier_new" RENAME TO "PlanTier";
DROP TYPE "PlanTier_old";

-- SubscriptionStatus: drop TRIALING
CREATE TYPE "SubscriptionStatus_new" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus_new" USING ("status"::text::"SubscriptionStatus_new");
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";
ALTER TYPE "SubscriptionStatus_new" RENAME TO "SubscriptionStatus";
DROP TYPE "SubscriptionStatus_old";

-- Subscription: drop trial column, add plan-change tracking columns
ALTER TABLE "Subscription" DROP COLUMN "trialEndsAt";
ALTER TABLE "Subscription" ADD COLUMN "previousDodoSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "scheduledTier" "PlanTier";
ALTER TABLE "Subscription" ADD COLUMN "scheduledChangeAt" TIMESTAMP(3);

-- UsageLedger: drop unused column
ALTER TABLE "UsageLedger" DROP COLUMN "variantsUsed";

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dodoEventId" TEXT,
    "fromTier" "PlanTier",
    "toTier" "PlanTier",
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionEvent_userId_createdAt_idx" ON "SubscriptionEvent"("userId", "createdAt");

-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tier" "PlanTier",
    "productKey" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutIntent_userId_key" ON "CheckoutIntent"("userId");
