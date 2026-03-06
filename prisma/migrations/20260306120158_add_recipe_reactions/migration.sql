-- CreateTable
CREATE TABLE "RecipeReaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,

    CONSTRAINT "RecipeReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipeReaction_recipeId_idx" ON "RecipeReaction"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeReaction_userId_recipeId_key" ON "RecipeReaction"("userId", "recipeId");

-- AddForeignKey
ALTER TABLE "RecipeReaction" ADD CONSTRAINT "RecipeReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeReaction" ADD CONSTRAINT "RecipeReaction_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
