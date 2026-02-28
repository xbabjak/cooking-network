-- CreateTable
CREATE TABLE "UserRecipeCookCount" (
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "UserRecipeCookCount_recipeId_idx" ON "UserRecipeCookCount"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRecipeCookCount_userId_recipeId_key" ON "UserRecipeCookCount"("userId", "recipeId");

-- AddForeignKey
ALTER TABLE "UserRecipeCookCount" ADD CONSTRAINT "UserRecipeCookCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRecipeCookCount" ADD CONSTRAINT "UserRecipeCookCount_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
