"use client";

import { BarChart, LineChart, Heatmap } from "@mantine/charts";
import { Stack, Title, Paper } from "@mantine/core";

type GroceriesUsedPerDay = { date: string; used: number };
type CooksPerDay = { date: string; count: number };
type TopRecipe = { recipeId: string; recipeName: string; count: number };

type Props = {
  groceriesUsedPerDay: GroceriesUsedPerDay[];
  heatmapCooksPerDay: CooksPerDay[];
  topRecipes: TopRecipe[];
};

export function AnalyticsCharts({
  groceriesUsedPerDay,
  heatmapCooksPerDay,
  topRecipes,
}: Props) {
  const hasGroceriesUsed = groceriesUsedPerDay.some((d) => d.used > 0);
  const hasHeatmapData = heatmapCooksPerDay.some((d) => d.count > 0);
  const hasTopRecipes = topRecipes.length > 0;

  const heatmapData: Record<string, number> = {};
  if (hasHeatmapData) {
    for (const { date, count } of heatmapCooksPerDay) {
      if (count > 0) {
        heatmapData[date] = count;
      }
    }
  }

  const heatmapStartDate =
    heatmapCooksPerDay.length > 0
      ? new Date(heatmapCooksPerDay[0].date)
      : undefined;
  const heatmapEndDate =
    heatmapCooksPerDay.length > 0
      ? new Date(heatmapCooksPerDay[heatmapCooksPerDay.length - 1].date)
      : undefined;

  return (
    <Stack gap="xl">

    {heatmapStartDate && heatmapEndDate && (
      <Paper
        p="md"
        withBorder
        className="border-border bg-surface-alt rounded-lg"
      >
        <Title order={3} className="mb-4">
          When you cooked this year
        </Title>
        <div className="flex justify-center overflow-x-auto">
          <Heatmap
            data={heatmapData}
            startDate={heatmapStartDate}
            endDate={heatmapEndDate}
            withMonthLabels
            withWeekdayLabels
            withTooltip
            getTooltipLabel={(rect) =>
              `${rect.date}: ${rect.value ?? 0} time${
                rect.value === 1 ? "" : "s"
              }`
            }
            style={{ maxWidth: "100%" }}
          />
        </div>
      </Paper>
    )}
    
      {hasGroceriesUsed && (
        <Paper
          p="md"
          withBorder
          className="border-border bg-surface-alt rounded-lg"
        >
          <Title order={3} className="mb-4">
            Groceries used
          </Title>
          <BarChart
            h={280}
            data={groceriesUsedPerDay}
            dataKey="date"
            series={[{ name: "used", color: "var(--color-primary)" }]}
            withBarValueLabel
            xAxisProps={{ tickFormatter: (v: string) => v.slice(5) }}
          />
        </Paper>
      )}

      {hasTopRecipes && (
        <Paper
          p="md"
          withBorder
          className="border-border bg-surface-alt rounded-lg"
        >
          <Title order={3} className="mb-4">
            Top recipes
          </Title>
          <LineChart
            h={280}
            data={topRecipes}
            dataKey="recipeName"
            series={[{ name: "count", color: "var(--color-primary)" }]}
            strokeDasharray="5 5"
            withDots
          />
        </Paper>
      )}
    </Stack>
  );
}
