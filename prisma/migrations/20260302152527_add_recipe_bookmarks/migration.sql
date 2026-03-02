-- CreateTable
CREATE TABLE "UserRecipeBookmark" (
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UserRecipeBookmark_userId_idx" ON "UserRecipeBookmark"("userId");

-- CreateIndex
CREATE INDEX "UserRecipeBookmark_recipeId_idx" ON "UserRecipeBookmark"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRecipeBookmark_userId_recipeId_key" ON "UserRecipeBookmark"("userId", "recipeId");

-- AddForeignKey
ALTER TABLE "UserRecipeBookmark" ADD CONSTRAINT "UserRecipeBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRecipeBookmark" ADD CONSTRAINT "UserRecipeBookmark_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
