-- Create GroceryItem and GroceryItemAlias tables
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultUnit" TEXT NOT NULL DEFAULT 'items',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroceryItem_name_key" ON "GroceryItem"("name");

CREATE TABLE "GroceryItemAlias" (
    "id" TEXT NOT NULL,
    "groceryItemId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "GroceryItemAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroceryItemAlias_alias_key" ON "GroceryItemAlias"("alias");
CREATE INDEX "GroceryItemAlias_alias_idx" ON "GroceryItemAlias"("alias");

-- Migrate distinct names from Grocery and RecipeIngredient into GroceryItem
INSERT INTO "GroceryItem" ("id", "name", "defaultUnit", "createdAt")
SELECT gen_random_uuid()::text, "name", 'items', CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT lower(trim("name")) as "name"
    FROM "Grocery"
    UNION
    SELECT DISTINCT lower(trim("ingredientName")) as "name"
    FROM "RecipeIngredient"
) AS distinct_names;

-- Add groceryItemId to Grocery (nullable temporarily)
ALTER TABLE "Grocery" ADD COLUMN "groceryItemId" TEXT;

-- Update Grocery with groceryItemId from GroceryItem
UPDATE "Grocery"
SET "groceryItemId" = (
    SELECT gi."id"
    FROM "GroceryItem" gi
    WHERE gi."name" = lower(trim("Grocery"."name"))
    LIMIT 1
);

-- Add groceryItemId to RecipeIngredient (nullable temporarily)
ALTER TABLE "RecipeIngredient" ADD COLUMN "groceryItemId" TEXT;

-- Update RecipeIngredient with groceryItemId from GroceryItem
UPDATE "RecipeIngredient"
SET "groceryItemId" = (
    SELECT gi."id"
    FROM "GroceryItem" gi
    WHERE gi."name" = lower(trim("RecipeIngredient"."ingredientName"))
    LIMIT 1
);

-- Delete any orphan rows (missing GroceryItem match) - clean slate for those
DELETE FROM "Grocery" WHERE "groceryItemId" IS NULL;
DELETE FROM "RecipeIngredient" WHERE "groceryItemId" IS NULL;

-- Make groceryItemId required and add FK
ALTER TABLE "Grocery" ALTER COLUMN "groceryItemId" SET NOT NULL;
ALTER TABLE "Grocery" DROP COLUMN "name";

ALTER TABLE "RecipeIngredient" ALTER COLUMN "groceryItemId" SET NOT NULL;
ALTER TABLE "RecipeIngredient" DROP COLUMN "ingredientName";

-- Add foreign keys
ALTER TABLE "GroceryItemAlias" ADD CONSTRAINT "GroceryItemAlias_groceryItemId_fkey" FOREIGN KEY ("groceryItemId") REFERENCES "GroceryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Grocery" ADD CONSTRAINT "Grocery_groceryItemId_fkey" FOREIGN KEY ("groceryItemId") REFERENCES "GroceryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_groceryItemId_fkey" FOREIGN KEY ("groceryItemId") REFERENCES "GroceryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
