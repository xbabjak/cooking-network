-- CreateTable
CREATE TABLE "GroceryType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroceryType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroceryType_name_key" ON "GroceryType"("name");

-- Insert GroceryType rows (match seed categories + Other)
INSERT INTO "GroceryType" ("id", "name", "sortOrder") VALUES
    (gen_random_uuid()::text, 'Vegetables', 0),
    (gen_random_uuid()::text, 'Fruits', 1),
    (gen_random_uuid()::text, 'Dairy & eggs', 2),
    (gen_random_uuid()::text, 'Meat, poultry & fish', 3),
    (gen_random_uuid()::text, 'Grains, pasta & bread', 4),
    (gen_random_uuid()::text, 'Oils, vinegar & sauces', 5),
    (gen_random_uuid()::text, 'Spices & herbs', 6),
    (gen_random_uuid()::text, 'Pantry & canned', 7),
    (gen_random_uuid()::text, 'Baking', 8),
    (gen_random_uuid()::text, 'Condiments & other', 9),
    (gen_random_uuid()::text, 'Beverages', 10),
    (gen_random_uuid()::text, 'Other', 99);

-- Add groceryTypeId to GroceryItem as nullable
ALTER TABLE "GroceryItem" ADD COLUMN "groceryTypeId" TEXT;

-- Backfill: set all existing items to type "Other"
UPDATE "GroceryItem"
SET "groceryTypeId" = (SELECT "id" FROM "GroceryType" WHERE "name" = 'Other' LIMIT 1)
WHERE "groceryTypeId" IS NULL;

-- Make groceryTypeId required
ALTER TABLE "GroceryItem" ALTER COLUMN "groceryTypeId" SET NOT NULL;

-- Add foreign key and index
ALTER TABLE "GroceryItem" ADD CONSTRAINT "GroceryItem_groceryTypeId_fkey" FOREIGN KEY ("groceryTypeId") REFERENCES "GroceryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "GroceryItem_groceryTypeId_idx" ON "GroceryItem"("groceryTypeId");
