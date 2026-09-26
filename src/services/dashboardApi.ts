// Typed data layer for the dashboard.
//
// Every dashboard section reads through this payload, never through raw
// arrays. The numbers are composed from the transaction and budget stores
// (which are themselves shaped by the student's onboarding answers), so new
// entries, edits, deletions and budget changes show up here automatically.
//
// The saving tip and the key insight come from the Phase 3 engines, so the
// dashboard always agrees with the reports page.
//
// Replacing the stores with fetch() calls against the API will not require
// any component changes.

import type {
  DashboardData,
  OnboardingData,
  SpendingOverview,
  Transaction,
} from "../types";
import { listBudgets } from "./budgetService";
import { listTransactions } from "./transactionService";
import { getMonthlyInsight } from "./insightService";
import { getDashboardTip } from "./tipsService";
import { buildSixMonthTrend } from "./trend";

const DEFAULT_MONTHLY_INCOME = 45000;

function buildSpendingOverview(transactions: Transaction[]): SpendingOverview {
  const totals = new Map<string, number>();

  for (const item of transactions) {
    if (item.type !== "expense") continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  }

  const totalExpenses = [...totals.values()].reduce((sum, amount) => sum + amount, 0);

  const categories = [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses === 0 ? 0 : (amount / totalExpenses) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalExpenses,
    topCategory: categories[0]?.category ?? "",
    categories,
  };
}

/** One sentence for the dashboard; the full review lives on Reports. */
function conciseInsight(
  insight: { summary: string; change: string } | null,
): string | null {
  if (!insight) return null;
  const specific = !insight.change.startsWith("Spending stayed") && !insight.change.startsWith("There is no earlier");
  return specific ? insight.change : insight.summary;
}

/** Loads the full dashboard payload from the transaction and budget stores. */
export async function getDashboardData(profile: OnboardingData): Promise<DashboardData> {
  const [transactions, budgets, tip, insight] = await Promise.all([
    listTransactions(),
    listBudgets(),
    getDashboardTip(),
    getMonthlyInsight(),
  ]);

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const spending = buildSpendingOverview(transactions);
  const monthlyIncome =
    profile.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : DEFAULT_MONTHLY_INCOME;

  return {
    summary: {
      balance: totalIncome - totalExpenses,
      income: totalIncome,
      expenses: totalExpenses,
      savings: totalIncome - totalExpenses,
      savingsGoal: profile.savingsGoal,
      period: new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric" }),
    },
    transactions,
    spending,
    budgets,
    tip,
    insight: conciseInsight(insight),
    trend: buildSixMonthTrend(monthlyIncome, totalIncome, totalExpenses),
  };
}
