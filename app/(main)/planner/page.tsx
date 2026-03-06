import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecipesForPlanner } from "@/lib/recipes";
import { getPlannerEntries } from "@/lib/actions/planner";
import { MealPlannerClient } from "./meal-planner-client";

export const dynamic = "force-dynamic";

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Next 7 days including today (today through today + 6). */
function getDefaultRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startDate: toLocalYMD(start),
    endDate: toLocalYMD(end),
  };
}

export default async function PlannerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/planner");

  const { startDate, endDate } = getDefaultRange();
  const [recipes, initialEntries] = await Promise.all([
    getRecipesForPlanner(session.user.id),
    getPlannerEntries(session.user.id, startDate, endDate),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meal Planner</h1>
      <MealPlannerClient
        userId={session.user.id}
        recipes={recipes}
        initialEntries={initialEntries}
        defaultStartDate={startDate}
        defaultEndDate={endDate}
      />
    </div>
  );
}
