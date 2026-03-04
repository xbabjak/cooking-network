import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroceryItems } from "@/lib/grocery-items";
import { GroceryList } from "@/components/grocery-list";
import { AddFromReceiptButton } from "@/components/add-from-receipt";
import Link from "next/link";

export const dynamic = "force-dynamic";

const WARN_DAYS = 2;

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function isCloseToSpoiling(
  addedAt: Date | null,
  shelfLifeDays: number | null
): { close: boolean; expiresAt: Date | null } {
  if (addedAt == null || shelfLifeDays == null)
    return { close: false, expiresAt: null };
  const expiresAt = addDays(addedAt, shelfLifeDays);
  const now = new Date();
  const threshold = addDays(now, WARN_DAYS);
  return {
    close: expiresAt <= threshold,
    expiresAt,
  };
}

export default async function GroceriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/groceries");

  const [groceries, initialGroceryItems] = await Promise.all([
    prisma.grocery.findMany({
      where: { userId: session.user.id },
      include: {
        groceryItem: { include: { groceryType: true } },
      },
      orderBy: [
        { groceryItem: { groceryType: { sortOrder: "asc" } } },
        { groceryItem: { name: "asc" } },
      ],
    }),
    getGroceryItems(),
  ]);

  const lowStock = groceries.filter((g) => g.quantity < g.lowThreshold);

  const closeToSpoiling = groceries
    .map((g) => {
      const { close, expiresAt } = isCloseToSpoiling(
        g.addedAt,
        g.groceryItem.shelfLifeDays
      );
      return close ? { grocery: g, expiresAt } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const useByByGroceryId: Record<string, string> = {};
  for (const { grocery, expiresAt } of closeToSpoiling) {
    if (expiresAt)
      useByByGroceryId[grocery.id] = `Use by ${expiresAt.toLocaleDateString(undefined, { dateStyle: "medium" })}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">My Groceries</h1>
        <div className="flex items-center gap-2">
          <AddFromReceiptButton />
          <Link
            href="/recommend"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-md"
          >
            What can I cook?
          </Link>
        </div>
      </div>

      {closeToSpoiling.length > 0 && (
        <section className="p-4 border border-border rounded-lg bg-surface-alt">
          <h2 className="font-semibold text-primary">
            Close to spoiling – use soon
          </h2>
          <ul className="mt-2 space-y-1">
            {closeToSpoiling.map(({ grocery, expiresAt }) => (
              <li key={grocery.id} className="text-sm text-foreground">
                {grocery.groceryItem.name}: use by{" "}
                {expiresAt
                  ? expiresAt.toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

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

      <GroceryList
        groceries={groceries}
        initialGroceryItems={initialGroceryItems}
        useByByGroceryId={Object.keys(useByByGroceryId).length > 0 ? useByByGroceryId : undefined}
      />
    </div>
  );
}
