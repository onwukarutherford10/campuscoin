// Six-month income/expense trend used by both the dashboard card and the
// reports page, so the two views can never disagree.
//
// The five earlier months are shaped from the onboarding income figure (the
// app has no backend history yet); the current month always uses real totals.

import type { TrendPoint } from "../types";

const INCOME_SHAPE = [0.87, 0.77, 1.02, 0.92, 0.97];
const EXPENSE_SHAPE = [0.58, 0.63, 0.55, 0.5, 0.54];
const LABELS = ["Apr", "May", "Jun", "Jul", "Aug"];

export function buildSixMonthTrend(
  monthlyIncome: number,
  actualIncome: number,
  actualExpenses: number,
): TrendPoint[] {
  const history = LABELS.map((label, index) => ({
    label,
    income: Math.round(monthlyIncome * INCOME_SHAPE[index]),
    expenses: Math.round(monthlyIncome * EXPENSE_SHAPE[index]),
  }));

  const thisMonth = new Date().toLocaleDateString("en-NG", { month: "short" });
  return [...history, { label: thisMonth, income: actualIncome, expenses: actualExpenses }];
}

/** Recent-month expense baseline derived from the same mock history. */
export function recentAverageExpenses(monthlyIncome: number): number {
  const recent = EXPENSE_SHAPE.slice(-3);
  const average = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  return Math.round(monthlyIncome * average);
}
