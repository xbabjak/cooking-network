-- Insert GroceryType "Mine" for user-created grocery items (sortOrder -1 so it appears first)
INSERT INTO "GroceryType" ("id", "name", "sortOrder") VALUES (gen_random_uuid()::text, 'Mine', -1);
