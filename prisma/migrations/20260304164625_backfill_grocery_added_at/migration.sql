-- Backfill existing Grocery rows: use updatedAt as conservative addedAt
UPDATE "Grocery" SET "addedAt" = "updatedAt" WHERE "addedAt" IS NULL;