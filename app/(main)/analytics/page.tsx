import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCookEventsForUser,
  getCookEventsGroupedByDay,
  getGroceriesUsedPerDay,
  getTopCookedRecipes,
} from "@/lib/analytics";
import { AnalyticsCharts } from "@/components/analytics/analytics-charts";
import { Stack, Title, Text, Anchor } from "@mantine/core";
import { AnalyticsPageFilters } from "../../../components/analytics/analytics-page-filters";

export const dynamic = "force-dynamic";

const RANGE_DAYS = [7, 30, 90] as const;
type RangeDays = (typeof RANGE_DAYS)[number];

function getRangeFromParam(param: string | null): RangeDays {
  const n = param ? parseInt(param, 10) : 30;
  return RANGE_DAYS.includes(n as RangeDays) ? (n as RangeDays) : 30;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

function formatIngredient(
  qty: number,
  unit: string,
  name: string
): string {
  const u = unit?.trim() || "items";
  if (qty === 1 && (u === "items" || u === "item")) return name;
  return `${qty} ${u} ${name}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/analytics");

  const params = await searchParams;
  const rangeDays = getRangeFromParam(params.range ?? null);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - rangeDays);

  const fromYear = new Date();
  fromYear.setDate(fromYear.getDate() - 365);

  const [events, groceriesUsedPerDay, heatmapCooksPerDay, topRecipes] =
    await Promise.all([
      getCookEventsForUser(session.user.id, {
        from,
        to,
        limit: 200,
      }),
      getGroceriesUsedPerDay(session.user.id, from, to),
      getCookEventsGroupedByDay(session.user.id, fromYear, to),
      getTopCookedRecipes(session.user.id, 10),
    ]);

  const hasAny = events.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Title order={1} className="text-2xl font-bold">
            My cooking analytics
          </Title>
          <Text className="text-muted mt-1">
            What you cooked and which groceries you used.
          </Text>
        </div>
        <Suspense fallback={null}>
          <AnalyticsPageFilters currentRange={rangeDays} />
        </Suspense>
      </div>

      {!hasAny ? (
        <div className="p-6 border border-border rounded-lg text-center text-muted bg-surface-alt">
          <p>No cooking history in this period.</p>
          <p className="mt-2 text-sm">
            Mark recipes as done cooking to see your history and charts here.
          </p>
          <Link
            href="/feed"
            className="inline-block mt-4 text-primary hover:underline"
          >
            Go to Feed
          </Link>
        </div>
      ) : (
        <>
          <AnalyticsCharts
            groceriesUsedPerDay={groceriesUsedPerDay}
            heatmapCooksPerDay={heatmapCooksPerDay}
            topRecipes={topRecipes}
          />

          <Stack gap="sm">
            <Title order={3}>History</Title>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Recipe</th>
                    <th className="text-left p-3 font-medium">Post</th>
                    <th className="text-left p-3 font-medium">Groceries used</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-b border-border last:border-b-0">
                      <td className="whitespace-nowrap text-muted text-sm p-3">
                        {formatDate(event.cookedAt)}
                      </td>
                      <td className="font-medium p-3">
                        {event.recipe.name}
                      </td>
                      <td className="p-3">
                        {event.post ? (
                          <Anchor
                            component={Link}
                            href={`/post/${event.post.id}`}
                            className="text-primary"
                          >
                            {event.post.title}
                          </Anchor>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-sm text-muted max-w-xs p-3">
                        {event.recipe.ingredients.length === 0 ? (
                          "—"
                        ) : (
                          <span className="line-clamp-2">
                            {event.recipe.ingredients
                              .map((i) =>
                                formatIngredient(
                                  i.quantity,
                                  i.unit,
                                  i.groceryItem.name
                                )
                              )
                              .join(", ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Stack>
        </>
      )}
    </div>
  );
}
