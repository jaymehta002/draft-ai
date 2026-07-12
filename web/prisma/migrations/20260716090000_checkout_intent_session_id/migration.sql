-- CheckoutIntent: track the Dodo checkout session so an abandoned/failed
-- checkout can be detected and released immediately instead of waiting for
-- expiresAt.
ALTER TABLE "CheckoutIntent" ADD COLUMN "dodoCheckoutSessionId" TEXT;
