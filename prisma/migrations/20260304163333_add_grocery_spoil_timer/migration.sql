-- AlterTable
ALTER TABLE "Grocery" ADD COLUMN     "addedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GroceryItem" ADD COLUMN     "shelfLifeDays" INTEGER;
