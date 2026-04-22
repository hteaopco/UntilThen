-- Scheduled plan switch fields on Subscription.
-- Used when a subscriber upgrades monthly → annual (or downgrades
-- annual → monthly). The swap takes effect at the end of the
-- current billing period; these columns hold the pending new sub
-- until the webhook promotes them into plan + squareSubId.
ALTER TABLE "Subscription"
  ADD COLUMN "pendingPlan" "SubscriptionPlan",
  ADD COLUMN "pendingSquareSubId" TEXT,
  ADD COLUMN "pendingEffectiveDate" TIMESTAMP(3);

CREATE UNIQUE INDEX "Subscription_pendingSquareSubId_key"
  ON "Subscription"("pendingSquareSubId");
