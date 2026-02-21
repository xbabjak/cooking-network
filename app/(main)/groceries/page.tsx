import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroceryList } from "@/components/grocery-list";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GroceriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/groceries");

  const groceries = await prisma.grocery.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
  });

  const lowStock = groceries.filter((g) => g.quantity < g.lowThreshold);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Groceries</h1>
        <Link
          href="/recommend"
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md"
        >
          What can I cook?
        </Link>
      </div>

      {lowStock.length > 0 && (
        <section className="p-4 border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <h2 className="font-semibold text-amber-800 dark:text-amber-200">
            Low stock – consider restocking
          </h2>
          <ul className="mt-2 space-y-1">
            {lowStock.map((g) => (
              <li key={g.id} className="text-sm text-amber-700 dark:text-amber-300">
                {g.name}: {g.quantity} {g.unit} (remind when below {g.lowThreshold})
              </li>
            ))}
          </ul>
        </section>
      )}

      <GroceryList groceries={groceries} />
    </div>
  );
}
