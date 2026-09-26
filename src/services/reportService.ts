// Report computation (Phase 3, sections 3–5).
//
// Filters are applied here, not in components: the page passes ReportFilters
// and receives a fully-shaped payload (summary, category breakdown, six-month
// trend, current-month daily/weekly view, insight, history and tips).

import type {
  CategorySpending,
  CurrentMonthReport,
  MonthlyInsight,
  OnboardingData,
  ReportData,
  ReportFilters,
  ReportSummary,
  Transaction,
} from "../types";
import { loadOnboardingData } from "../utils/storage";
import { listBudgets } from "./budgetService";
import { listTransactions } from "./transactionService";
import { getMonthlyInsight, listInsightHistory } from "./insightService";
import { listSavedTips, listTips } from "./tipsService";
import { buildSixMonthTrend } from "./trend";
import { formatNaira } from "../utils/format";

const DEFAULT_MONTHLY_INCOME = 45000;

function toISO(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISO(date);
}

function sumOf(transactions: Transaction[], type: Transaction["type"]): number {
  return transactions
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** Applies the five report filters; each active filter narrows the result. */
export function applyReportFilters(items: Transaction[], filters: ReportFilters): Transaction[] {
  const monthPrefix = toISO(new Date()).slice(0, 7);

  return items.filter((entry) => {
    if (filters.range === "week" && entry.date < daysAgoISO(6)) return false;
    if (filters.range === "month" && !entry.date.startsWith(monthPrefix)) return false;
    if (filters.range === "lastMonth") {
      const last = new Date();
      last.setDate(1);
      last.setMonth(last.getMonth() - 1);
      const key = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}`;
      if (!entry.date.startsWith(key)) return false;
    }
    if (filters.range === "sixMonths" && entry.date < daysAgoISO(182)) return false;
    if (filters.month && !entry.date.startsWith(filters.month)) return false;
    if (filters.type !== "all" && entry.type !== filters.type) return false;
    if (filters.category && entry.category !== filters.category) return false;
    if (filters.source && !(entry.type === "income" && entry.category === filters.source)) return false;
    return true;
  });
}

function buildCategoryBreakdown(transactions: Transaction[]): CategorySpending[] {
  const totals = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== "expense") continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  }
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: total === 0 ? 0 : (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function periodLabel(filters: ReportFilters, allItems: Transaction[]): string {
  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString("en-NG", {
      month: "long",
      year: "numeric",
    });
  }
  switch (filters.range) {
    case "week":
      return "Last 7 days";
    case "month":
      return new Date().toLocaleDateString("en-NG", { month: "long", year: "numeric" });
    case "lastMonth": {
      const last = new Date();
      last.setDate(1);
      last.setMonth(last.getMonth() - 1);
      return last.toLocaleDateString("en-NG", { month: "long", year: "numeric" });
    }
    case "sixMonths":
      return "Last 6 months";
    default:
      return allItems.length > 0 ? "All activity" : "No activity";
  }
}

/** Daily and weekly spending for the current month, with useful context. */
function buildCurrentMonthReport(transactions: Transaction[]): CurrentMonthReport {
  const prefix = toISO(new Date()).slice(0, 7);
  const monthExpenses = transactions.filter(
    (entry) => entry.type === "expense" && entry.date.startsWith(prefix),
  );

  const byDay = new Map<string, number>();
  for (const item of monthExpenses) {
    byDay.set(item.date, (byDay.get(item.date) ?? 0) + item.amount);
  }
  const days = [...byDay.entries()]
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Bucket into week 1 (days 1–7), week 2 (8–14) and so on.
  const byWeek = new Map<number, number>();
  for (const item of monthExpenses) {
    const day = Number(item.date.slice(8, 10));
    const week = Math.min(Math.floor((day - 1) / 7) + 1, 5);
    byWeek.set(week, (byWeek.get(week) ?? 0) + item.amount);
  }
  const weeks = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, amount]) => ({ label: `Week ${week}`, amount }));

  const today = new Date();
  const isCurrentMonth = prefix === toISO(today).slice(0, 7);
  const daysElapsed = isCurrentMonth ? today.getDate() : 0;
  const total = days.reduce((sum, day) => sum + day.amount, 0);
  const averageDaily = daysElapsed > 0 ? Math.round(total / daysElapsed) : 0;

  const highestDay = days.length > 0 ? [...days].sort((a, b) => b.amount - a.amount)[0] : null;
  const highestWeek =
    weeks.length > 0 ? [...weeks].sort((a, b) => b.amount - a.amount)[0] : null;

  let context: string | null = null;
  if (weeks.length >= 2 && highestWeek) {
    context = `You spent most of your money during ${highestWeek.label} (${formatNaira(highestWeek.amount)}).`;
  } else if (days.length >= 3 && highestDay) {
    const date = new Date(highestDay.date);
    context = `Your biggest spending day was ${date.toLocaleDateString("en-NG", { day: "numeric", month: "long" })} (${formatNaira(highestDay.amount)}).`;
  }
  // Not enough data: context stays null — never fabricate a conclusion.

  return { days, weeks, averageDaily, highestDay, highestWeek, context };
}

function buildInterpretation(categories: CategorySpending[], totalExpenses: number): string | null {
  const top = categories[0];
  if (!top || totalExpenses === 0) return null;
  return `You spent most on ${top.category}: ${formatNaira(top.amount)} of ${formatNaira(totalExpenses)} (${Math.round(top.percentage)}%).`;
}

/** Loads everything the reports page shows in one call. */
export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  const [transactions, budgets, profile, pastInsights, tips, savedTips] = await Promise.all([
    listTransactions(),
    listBudgets(),
    Promise.resolve<OnboardingData>(loadOnboardingData()),
    listInsightHistory(),
    listTips(),
    listSavedTips(),
  ]);

  const filtered = applyReportFilters(transactions, filters);
  const income = sumOf(filtered, "income");
  const expenses = sumOf(filtered, "expense");
  const categories = buildCategoryBreakdown(filtered);

  const summary: ReportSummary = {
    income,
    expenses,
    net: income - expenses,
    savings: income - expenses,
    periodLabel: periodLabel(filters, transactions),
  };

  const monthlyIncome =
    profile.monthlyIncome && profile.monthlyIncome > 0
      ? profile.monthlyIncome
      : DEFAULT_MONTHLY_INCOME;

  const insight: MonthlyInsight | null =
    filters.type === "income" ? null : await getMonthlyInsight().catch(() => null);

  // The six-month trend is a fixed "all activity" view — composition filters
  // (category/type/source) would turn its current-month point misleading.
  const trend = buildSixMonthTrend(
    monthlyIncome,
    sumOf(transactions, "income"),
    sumOf(transactions, "expense"),
  );

  return {
    summary,
    categories,
    interpretation: buildInterpretation(categories, expenses),
    trend,
    currentMonth: buildCurrentMonthReport(filtered),
    insight,
    pastInsights,
    tips,
    savedTips,
    budgets,
    hasTransactions: transactions.length > 0,
  };
}
