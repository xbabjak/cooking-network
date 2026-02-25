import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroceryItems } from "@/lib/grocery-items";
import { GroceryList } from "@/components/grocery-list";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GroceriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/groceries");

  const [groceries, initialGroceryItems] = await Promise.all([
    prisma.grocery.findMany({
      where: { userId: session.user.id },
      include: { groceryItem: true },
      orderBy: { groceryItem: { name: "asc" } },
    }),
    getGroceryItems(),
  ]);

  const lowStock = groceries.filter((g) => g.quantity < g.lowThreshold);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Groceries</h1>
        <Link
          href="/recommend"
          className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md"
        >
          What can I cook?
        </Link>
      </div>

      {lowStock.length > 0 && (
        <section className="p-4 border border-border rounded-lg bg-surface-alt">
          <h2 className="font-semibold text-primary">
            Low stock – consider restocking
          </h2>
          <ul className="mt-2 space-y-1">
            {lowStock.map((g) => (
              <li key={g.id} className="text-sm text-foreground">
                {g.groceryItem.name}: {g.quantity} {g.unit} (remind when below {g.lowThreshold})
              </li>
            ))}
          </ul>
        </section>
      )}

      <GroceryList groceries={groceries} initialGroceryItems={initialGroceryItems} />
    </div>
  );
}
