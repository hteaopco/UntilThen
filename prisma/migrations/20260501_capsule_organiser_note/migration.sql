-- Free-text note from the organiser to every contributor on a
-- gift capsule. Rendered on the contributor invite phase under
-- the templated tone copy as a quoted, signed line. Nullable
-- and additive -- legacy capsules keep working without it.

ALTER TABLE "MemoryCapsule"
  ADD COLUMN "organiserNote" TEXT;
