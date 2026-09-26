// Monthly insight engine (Phase 3, sections 10–12).
//
// Input is plain data — a month of transactions, the month before it, the
// budgets and the savings goal — and the output is three short sentences in
// advisory language. Nothing here ever blocks or mutates user data.

import type { Budget, MonthlyInsight, OnboardingData, Transaction } from "../types";
import { loadOnboardingData } from "../utils/storage";
import { listBudgets } from "./budgetService";
import { listTransactions } from "./transactionService";
import { delay, loadJSON, saveJSON } from "./store";
import { formatNaira } from "../utils/format";

const INSIGHTS_KEY = "campuscoin.insights";
const MIN_PREV_SPEND = 500; // below this, percentage changes would be noise.

function monthKeyOf(date: string): string {
  return date.slice(0, 7);
}

function monthKeyNow(): string {
  return monthKeyOf(new Date().toISOString().slice(0, 10));
}

function labelOfMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

function expenseTotalsByCategory(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== "expense") continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  }
  return totals;
}

function sumOf(transactions: Transaction[], type: Transaction["type"]): number {
  return transactions
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Pure builder: everything it needs is passed in, nothing is read globally. */
export function buildMonthlyInsight(
  monthKey: string,
  monthTransactions: Transaction[],
  previousTransactions: Transaction[],
  budgets: Budget[],
  savingsGoal: number | null,
): MonthlyInsight {
  const expenses = sumOf(monthTransactions, "expense");
  const previousExpenses = sumOf(previousTransactions, "expense");
  const current = expenseTotalsByCategory(monthTransactions);
  const previous = expenseTotalsByCategory(previousTransactions);
  const monthLabel = labelOfMonthKey(monthKey);

  const top = [...current.entries()].sort((a, b) => b[1] - a[1])[0];

  // Biggest category change worth mentioning (only from a meaningful base).
  let changeCategory = "";
  let changePercent = 0;
  for (const [category, amount] of current) {
    const before = previous.get(category) ?? 0;
    if (before < MIN_PREV_SPEND) continue;
    const percent = Math.round(((amount - before) / before) * 100);
    if (Math.abs(percent) >= 10 && Math.abs(percent) > Math.abs(changePercent)) {
      changeCategory = category;
      changePercent = percent;
    }
  }

  let summary: string;
  if (previousExpenses === 0) {
    summary = top
      ? `You spent ${formatNaira(expenses)} in ${monthLabel}, with ${top[0]} as your biggest category.`
      : `You recorded no spending in ${monthLabel}.`;
  } else if (expenses > previousExpenses) {
    summary = `You spent more this month: expenses went from ${formatNaira(previousExpenses)} to ${formatNaira(expenses)}.`;
  } else {
    summary = `You spent less this month: expenses went from ${formatNaira(previousExpenses)} down to ${formatNaira(expenses)}.`;
  }

  let change: string;
  if (changeCategory && changePercent > 0) {
    change = `Your ${changeCategory} spending increased by ${changePercent}%.`;
  } else if (changeCategory) {
    change = `Your ${changeCategory} spending decreased by ${Math.abs(changePercent)}%.`;
  } else if (previousExpenses > 0) {
    change = "Spending stayed close to last month across categories.";
  } else {
    change = "There is no earlier month to compare against yet.";
  }

  const risk = [...budgets]
    .map((budget) => ({
      budget,
      percentage: budget.limit === 0 ? 0 : (budget.spent / budget.limit) * 100,
    }))
    .filter((entry) => entry.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage)[0];

  let suggestion: string;
  if (risk) {
    const over = risk.budget.spent - risk.budget.limit;
    suggestion =
      over > 0
        ? `One option could be easing off ${risk.budget.category}, since you're ${formatNaira(over)} over that budget.`
        : `You may want to consider slowing down on ${risk.budget.category}; that budget is nearly reached.`;
  } else if (changeCategory && changePercent > 0) {
    suggestion = `Reducing ${changeCategory} slightly could lower your monthly spending and help your savings goal.`;
  } else if (savingsGoal && top && sumOf(monthTransactions, "income") - expenses < savingsGoal) {
    suggestion = `You're below your savings target. One option could be a small weekly cap on ${top[0]}.`;
  } else {
    suggestion = `You may want to consider a monthly target for ${top ? top[0] : "your spending"} next month.`;
  }

  return { id: monthKey, month: monthLabel, summary, change, suggestion };
}

function readStore(): MonthlyInsight[] {
  return loadJSON<MonthlyInsight[]>(INSIGHTS_KEY, []);
}

function writeStore(insights: MonthlyInsight[]): void {
  saveJSON(INSIGHTS_KEY, insights);
}

/** First read seeds two plausible past reviews so history has something to show. */
function seedHistory(profile: OnboardingData): MonthlyInsight[] {
  const income = profile.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : 45000;
  const now = new Date();

  return [1, 2].map((back) => {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const expenses = Math.round(income * (back === 1 ? 0.54 : 0.5));
    return {
      id: key,
      month: labelOfMonthKey(key),
      summary: `You spent ${formatNaira(expenses)} that month.`,
      change:
        back === 1
          ? "Your Food spending increased by 14%."
          : "Spending stayed close to the month before across categories.",
      suggestion:
        back === 1
          ? "One option could be planning your Food spending weekly."
          : "You may want to consider a transport target for the month ahead.",
    } satisfies MonthlyInsight;
  });
}

/**
 * Computes this month's insight from live data and files it in history.
 * Returns null when there is nothing to review yet.
 */
export async function getMonthlyInsight(): Promise<MonthlyInsight | null> {
  const [transactions, budgets, profile] = await Promise.all([
    listTransactions(),
    listBudgets(),
    Promise.resolve(loadOnboardingData()),
  ]);
  if (transactions.length === 0) return null;

  const key = monthKeyNow();
  const previousKeyDate = new Date();
  previousKeyDate.setDate(1);
  previousKeyDate.setMonth(previousKeyDate.getMonth() - 1);
  const previousKey = `${previousKeyDate.getFullYear()}-${String(previousKeyDate.getMonth() + 1).padStart(2, "0")}`;

  const insight = buildMonthlyInsight(
    key,
    transactions.filter((entry) => monthKeyOf(entry.date) === key),
    transactions.filter((entry) => monthKeyOf(entry.date) === previousKey),
    budgets,
    profile.savingsGoal,
  );

  const stored = readStore().filter((entry) => entry.id !== key);
  writeStore([insight, ...stored]);
  return insight;
}

/** Past reviews, newest first; seeded once so the list is never bare. */
export async function listInsightHistory(): Promise<MonthlyInsight[]> {
  const profile = loadOnboardingData();
  const currentKey = monthKeyNow();
  let stored = readStore();

  // Seed whenever no PAST review exists yet — the current month alone (filed
  // by the dashboard's insight call) must not block the seeding.
  const hasPast = stored.some((entry) => entry.id !== currentKey);
  if (!hasPast) {
    const seeded = seedHistory(profile).filter(
      (entry) => entry.id !== currentKey && !stored.some((known) => known.id === entry.id),
    );
    if (seeded.length > 0) {
      stored = [...stored, ...seeded];
      writeStore(stored);
    }
  }

  return delay(
    stored
      .filter((entry) => entry.id !== currentKey)
      .sort((a, b) => b.id.localeCompare(a.id)),
  );
}
