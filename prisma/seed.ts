import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function getGroceryTypeMap(): Promise<Record<string, string>> {
  const types = await prisma.groceryType.findMany({
    select: { id: true, name: true },
  });
  return Object.fromEntries(types.map((t) => [t.name, t.id]));
}

async function findOrCreateGroceryItem(name: string, groceryTypeId: string) {
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const existing = await prisma.groceryItem.findFirst({
    where: { name: { equals: capitalized, mode: "insensitive" } },
  });
  if (existing) {
    await prisma.groceryItem.update({
      where: { id: existing.id },
      data: { groceryTypeId },
    });
    return prisma.groceryItem.findUniqueOrThrow({ where: { id: existing.id } });
  }
  return prisma.groceryItem.create({
    data: { name: capitalized, groceryTypeId },
  });
}

async function main() {
  const vegetables = [
    "Onion", "Carrot", "Celery", "Bell pepper", "Broccoli", "Spinach", "Zucchini",
    "Potato", "Sweet potato", "Mushrooms", "Green beans", "Peas", "Corn", "Cabbage",
    "Kale", "Leek", "Asparagus", "Eggplant", "Tomatoes", "Lettuce", "Cucumber",
    "Garlic", "Radish", "Beet", "Brussels sprouts", "Cauliflower", "Collard greens",
    "Fennel", "Okra", "Parsnip", "Pumpkin", "Swiss chard", "Turnip", "Watercress",
    "Green onion", "Shallot", "Bok choy", "Arugula", "Romaine", "Cherry tomatoes",
    "Butternut squash", "Scallion", "Snow peas", "Edamame", "Bean sprouts", "Water chestnuts",
  ];
  const fruits = [
    "Lemon", "Lime", "Apple", "Banana", "Orange", "Strawberries", "Blueberries",
    "Raspberries", "Blackberries", "Avocado", "Mango", "Pineapple", "Peach", "Pear",
    "Plum", "Grapes", "Cranberries", "Coconut", "Cherry", "Grapefruit", "Kiwi",
    "Melon", "Watermelon", "Cantaloupe", "Apricot", "Fig", "Pomegranate", "Papaya",
    "Passion fruit", "Dragon fruit", "Dates", "Prunes", "Raisins",
    "Nectarine", "Clementine", "Tangerine", "Persimmon", "Rhubarb", "Lychee", "Guava",
  ];
  const dairyAndEggs = [
    "Eggs", "Butter", "Milk", "Cream", "Yogurt", "Parmesan", "Cheddar", "Mozzarella",
    "Feta", "Sour cream", "Cottage cheese", "Ricotta", "Cream cheese", "Goat cheese",
    "Swiss cheese", "Brie", "Heavy cream", "Half and half", "Condensed milk",
    "Mascarpone", "Gruyère", "Provolone", "Blue cheese", "Ghee", "Kefir",
  ];
  const meatPoultryFish = [
    "Chicken", "Beef", "Pork", "Lamb", "Bacon", "Sausage", "Salmon", "Tuna", "Shrimp",
    "Cod", "Tilapia", "Halibut", "Turkey", "Ground beef", "Ground pork", "Ham",
    "Chicken breast", "Chicken thigh", "Pork chop", "Steak", "Lobster", "Crab",
    "Anchovies", "Sardines", "White fish", "Duck", "Veal",
    "Ground turkey", "Scallops", "Mussels", "Calamari", "Turkey breast",
  ];
  const grainsPastaBread = [
    "Flour", "Rice", "Pasta", "Bread", "Oats", "Couscous", "Quinoa", "Breadcrumbs",
    "All-purpose flour", "Whole wheat flour", "Cornmeal", "Polenta", "Barley",
    "Bulgur", "Noodles", "Spaghetti", "Penne", "Lasagna noodles", "Tortilla",
    "Pita bread", "Bagel", "Croissant", "Cereal", "Granola",
    "Orzo", "Farro", "Arborio rice", "Sourdough bread", "English muffin", "Flatbread",
  ];
  const oilsVinegarSauces = [
    "Olive oil", "Vegetable oil", "Canola oil", "Coconut oil", "Sesame oil",
    "White vinegar", "Balsamic vinegar", "Apple cider vinegar", "Rice vinegar",
    "Soy sauce", "Tomato paste", "Fish sauce", "Oyster sauce", "Teriyaki sauce",
    "Hot sauce", "Worcestershire sauce", "Tomato sauce",
    "Avocado oil", "Mirin", "Hoisin sauce", "Chili oil",
  ];
  const spicesAndHerbs = [
    "Salt", "Black pepper", "Paprika", "Cumin", "Cinnamon", "Nutmeg", "Oregano",
    "Basil", "Thyme", "Rosemary", "Parsley", "Cilantro", "Bay leaves", "Ginger",
    "Turmeric", "Chili powder", "Cayenne pepper", "Red pepper flakes", "Coriander",
    "Cardamom", "Cloves", "Allspice", "Mustard seeds", "Fennel seeds", "Dill",
    "Sage", "Mint", "Tarragon", "Marjoram", "Smoked paprika", "Garlic powder",
    "Onion powder", "Italian seasoning", "Curry powder", "Vanilla bean",
    "Sumac", "Za'atar", "Saffron", "White pepper",
    "Star anise", "Juniper berries", "Lavender", "Nigella seeds", "Poppy seeds",
    "Celery salt", "Lemon zest", "Orange zest", "Chipotle powder", "Anise",
    "Fenugreek", "Mace", "Pink peppercorns", "Herbes de Provence", "Five-spice powder",
  ];
  const pantryCanned = [
    "Canned tomatoes", "Black beans", "Kidney beans", "Chickpeas", "Lentils",
    "Chicken stock", "Vegetable stock", "Beef stock", "Coconut milk", "Honey",
    "Maple syrup", "Jam", "Peanut butter", "Almond butter", "Tahini", "Olives",
    "Capers", "Sun-dried tomatoes", "Canned corn", "Canned beans", "Broth",
    "Salsa", "Chipotle peppers", "Green chiles", "Artichoke hearts", "Pesto",
    "Nutella", "Marmalade", "Molasses", "Agave syrup", "Golden syrup",
    "Cannellini beans", "Pinto beans", "Navy beans", "Diced tomatoes", "Crushed tomatoes",
    "Tomato puree", "Almonds", "Cashews", "Walnuts", "Pecans", "Pine nuts",
  ];
  const baking = [
    "Sugar", "Brown sugar", "Baking powder", "Baking soda", "Vanilla extract",
    "Cocoa powder", "Chocolate", "Chocolate chips", "Powdered sugar", "Cornstarch",
    "Yeast", "Almond extract", "Cream of tartar", "Shortening", "Pie crust",
    "Phyllo dough", "Puff pastry", "Condensed milk", "Evaporated milk",
    "Bread flour", "Cake flour", "Dark chocolate", "Milk chocolate", "Coconut flakes",
  ];
  const condimentsAndOther = [
    "Mustard", "Ketchup", "Mayonnaise", "Relish", "Barbecue sauce", "Sriracha",
    "Horseradish", "Tartar sauce", "Ranch dressing", "Vinaigrette", "Hummus",
    "Guacamole", "Sour cream", "Pickles", "Jalapeños",
    "Dijon mustard", "Buffalo sauce",
  ];
  const beverages = [
    "Coffee", "Tea", "Juice", "Orange juice", "Lemon juice", "Lime juice",
    "Apple juice", "Cranberry juice", "Tomato juice", "Soda", "Tonic water",
    "Beer", "Wine", "Red wine", "White wine", "Vinegar", "Sparkling water",
    "Coconut water", "Almond milk", "Oat milk", "Green tea", "Espresso",
    "Cold brew", "Chai tea", "Herbal tea", "Iced tea", "Mineral water",
  ];

  const typeMap = await getGroceryTypeMap();
  const categoryEntries: [string, string[]][] = [
    ["Vegetables", vegetables],
    ["Fruits", fruits],
    ["Dairy & eggs", dairyAndEggs],
    ["Meat, poultry & fish", meatPoultryFish],
    ["Grains, pasta & bread", grainsPastaBread],
    ["Oils, vinegar & sauces", oilsVinegarSauces],
    ["Spices & herbs", spicesAndHerbs],
    ["Pantry & canned", pantryCanned],
    ["Baking", baking],
    ["Condiments & other", condimentsAndOther],
    ["Beverages", beverages],
  ];

  let itemCount = 0;
  for (const [typeName, names] of categoryEntries) {
    const typeId = typeMap[typeName];
    if (!typeId) throw new Error(`GroceryType not found: ${typeName}`);
    for (const name of names) {
      await findOrCreateGroceryItem(name, typeId);
      itemCount++;
    }
  }
  console.log("Seeded grocery items:", itemCount);

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

  const otherTypeId = typeMap["Other"];
  if (!otherTypeId) throw new Error("GroceryType 'Other' not found");

  for (const r of recipes) {
    if (existingNames.has(r.name)) continue;
    const ingredientData = await Promise.all(
      r.ingredients.map(async (i) => {
        const item = await findOrCreateGroceryItem(i.name, otherTypeId);
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
