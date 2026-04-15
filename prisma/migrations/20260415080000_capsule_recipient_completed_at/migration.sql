-- Track when a recipient finishes the sequential reveal so analytics
-- can distinguish "opened" from "completed" and future surfaces can
-- reward completion separately.

ALTER TABLE "MemoryCapsule" ADD COLUMN "recipientCompletedAt" TIMESTAMP(3);
