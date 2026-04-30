-- New OccasionType: JUST_BECAUSE.
--
-- Surfaces in the wizard alongside Birthday / Anniversary /
-- etc. as the "no specific occasion" option for organisers
-- sending a gift capsule outside a milestone. Postgres needs
-- ALTER TYPE ... ADD VALUE for enum extensions.

ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'JUST_BECAUSE';
