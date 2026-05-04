-- Extended OccasionType set for the wizard's "More occasions"
-- expander. Each value is added with IF NOT EXISTS so re-running
-- the migration on a partially-applied DB is a no-op.
--
-- Group mapping (the wizard renders them in these sections):
--   Celebrations:        ENGAGEMENT, BAPTISM, CONGRATULATIONS
--   Appreciation & Care: THANK_YOU, FRIENDSHIP
--   Support:             GET_WELL, SYMPATHY

ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'ENGAGEMENT';
ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'BAPTISM';
ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'CONGRATULATIONS';
ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'THANK_YOU';
ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'FRIENDSHIP';
ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'GET_WELL';
ALTER TYPE "OccasionType" ADD VALUE IF NOT EXISTS 'SYMPATHY';
