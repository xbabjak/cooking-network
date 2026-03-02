-- Fix migration history after renaming 20260325120000 -> 20260302101800
-- Run once: npx prisma db execute --file prisma/fix-migration-history.sql
UPDATE "_prisma_migrations"
SET "migration_name" = '20260302101800_add_recipe_ingredient_one_of_group_id'
WHERE "migration_name" = '20260325120000_add_recipe_ingredient_one_of_group_id';
