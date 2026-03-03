-- CreateTable
CREATE TABLE "UnitCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUnitSymbol" TEXT NOT NULL,

    CONSTRAINT "UnitCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "unitCategoryId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "factorToBase" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryTypeUnitCategory" (
    "groceryTypeId" TEXT NOT NULL,
    "unitCategoryId" TEXT NOT NULL,

    CONSTRAINT "GroceryTypeUnitCategory_pkey" PRIMARY KEY ("groceryTypeId","unitCategoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnitCategory_name_key" ON "UnitCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_symbol_key" ON "Unit"("symbol");

-- CreateIndex
CREATE INDEX "Unit_unitCategoryId_idx" ON "Unit"("unitCategoryId");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_unitCategoryId_fkey" FOREIGN KEY ("unitCategoryId") REFERENCES "UnitCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryTypeUnitCategory" ADD CONSTRAINT "GroceryTypeUnitCategory_groceryTypeId_fkey" FOREIGN KEY ("groceryTypeId") REFERENCES "GroceryType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryTypeUnitCategory" ADD CONSTRAINT "GroceryTypeUnitCategory_unitCategoryId_fkey" FOREIGN KEY ("unitCategoryId") REFERENCES "UnitCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
