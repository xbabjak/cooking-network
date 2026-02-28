-- Put "Mine" after "Other" (Other is 99, so Mine = 100)
UPDATE "GroceryType" SET "sortOrder" = 100 WHERE "name" = 'Mine';
