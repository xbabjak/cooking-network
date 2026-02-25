import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function findOrCreateGroceryItem(name: string) {
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const existing = await prisma.groceryItem.findFirst({
    where: { name: { equals: capitalized, mode: "insensitive" } },
  });
  if (existing) return existing;
  return prisma.groceryItem.create({
    data: { name: capitalized },
  });
}

async function main() {
  const commonItems = [
    "Eggs", "Butter", "Salt", "Pasta", "Tomatoes", "Garlic", "Olive oil",
    "Lettuce", "Cucumber", "Milk", "Cereal", "Bread",
  ];
  for (const name of commonItems) {
    await findOrCreateGroceryItem(name);
  }
  console.log("Seeded grocery items");

  const recipes = [
    {
      name: "Scrambled Eggs",
      description: "Simple fluffy scrambled eggs",
      ingredients: [
        { name: "eggs", quantity: 2, unit: "" },
        { name: "butter", quantity: 1, unit: "tbsp" },
        { name: "salt", quantity: 1, unit: "pinch" },
      ],
    },
    {
      name: "Tomato Pasta",
      description: "Quick pasta with tomato sauce",
      ingredients: [
        { name: "pasta", quantity: 200, unit: "g" },
        { name: "tomatoes", quantity: 2, unit: "" },
        { name: "garlic", quantity: 2, unit: "cloves" },
        { name: "olive oil", quantity: 2, unit: "tbsp" },
        { name: "salt", quantity: 1, unit: "pinch" },
      ],
    },
    {
      name: "Green Salad",
      description: "Fresh salad with olive oil dressing",
      ingredients: [
        { name: "lettuce", quantity: 1, unit: "head" },
        { name: "tomatoes", quantity: 2, unit: "" },
        { name: "cucumber", quantity: 0.5, unit: "" },
        { name: "olive oil", quantity: 2, unit: "tbsp" },
        { name: "salt", quantity: 1, unit: "pinch" },
      ],
    },
    {
      name: "Milk and Cereal",
      description: "Classic breakfast",
      ingredients: [
        { name: "milk", quantity: 1, unit: "cup" },
        { name: "cereal", quantity: 1, unit: "bowl" },
      ],
    },
    {
      name: "Garlic Bread",
      description: "Toasted bread with garlic butter",
      ingredients: [
        { name: "bread", quantity: 4, unit: "slices" },
        { name: "butter", quantity: 2, unit: "tbsp" },
        { name: "garlic", quantity: 2, unit: "cloves" },
      ],
    },
  ];

  const existing = await prisma.recipe.findMany({
    where: { name: { in: recipes.map((r) => r.name) } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name));

  for (const r of recipes) {
    if (existingNames.has(r.name)) continue;
    const ingredientData = await Promise.all(
      r.ingredients.map(async (i) => {
        const item = await findOrCreateGroceryItem(i.name);
        return { groceryItemId: item.id, quantity: i.quantity, unit: i.unit };
      })
    );
    await prisma.recipe.create({
      data: {
        name: r.name,
        description: r.description,
        ingredients: { create: ingredientData },
      },
    });
  }

  console.log("Seeded recipes:", recipes.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
