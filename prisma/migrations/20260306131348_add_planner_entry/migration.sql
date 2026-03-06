-- CreateTable
CREATE TABLE "PlannerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "recipeId" TEXT NOT NULL,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "PlannerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlannerEntry_userId_date_idx" ON "PlannerEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "PlannerEntry" ADD CONSTRAINT "PlannerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannerEntry" ADD CONSTRAINT "PlannerEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
