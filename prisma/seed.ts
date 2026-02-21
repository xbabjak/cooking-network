import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const recipes = [
    {
      name: "Scrambled Eggs",
      description: "Simple fluffy scrambled eggs",
      ingredients: [
        { ingredientName: "eggs", quantity: 2, unit: "" },
        { ingredientName: "butter", quantity: 1, unit: "tbsp" },
        { ingredientName: "salt", quantity: 1, unit: "pinch" },
      ],
    },
    {
      name: "Tomato Pasta",
      description: "Quick pasta with tomato sauce",
      ingredients: [
        { ingredientName: "pasta", quantity: 200, unit: "g" },
        { ingredientName: "tomatoes", quantity: 2, unit: "" },
        { ingredientName: "garlic", quantity: 2, unit: "cloves" },
        { ingredientName: "olive oil", quantity: 2, unit: "tbsp" },
        { ingredientName: "salt", quantity: 1, unit: "pinch" },
      ],
    },
    {
      name: "Green Salad",
      description: "Fresh salad with olive oil dressing",
      ingredients: [
        { ingredientName: "lettuce", quantity: 1, unit: "head" },
        { ingredientName: "tomatoes", quantity: 2, unit: "" },
        { ingredientName: "cucumber", quantity: 0.5, unit: "" },
        { ingredientName: "olive oil", quantity: 2, unit: "tbsp" },
        { ingredientName: "salt", quantity: 1, unit: "pinch" },
      ],
    },
    {
      name: "Milk and Cereal",
      description: "Classic breakfast",
      ingredients: [
        { ingredientName: "milk", quantity: 1, unit: "cup" },
        { ingredientName: "cereal", quantity: 1, unit: "bowl" },
      ],
    },
    {
      name: "Garlic Bread",
      description: "Toasted bread with garlic butter",
      ingredients: [
        { ingredientName: "bread", quantity: 4, unit: "slices" },
        { ingredientName: "butter", quantity: 2, unit: "tbsp" },
        { ingredientName: "garlic", quantity: 2, unit: "cloves" },
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
    await prisma.recipe.create({
      data: {
        name: r.name,
        description: r.description,
        ingredients: {
          create: r.ingredients.map((i) => ({
            ingredientName: i.ingredientName.toLowerCase(),
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
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
