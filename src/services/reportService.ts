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
import { DATA_MODE } from "./api/config";
import { api } from "./api";
import type { ApiCategory, ApiReport } from "./api/dto";
import { moneyToNumber } from "./api/adapters";
import { calendarDate, dateAtLocalTime } from "./transactionService";
import { getAuthSnapshot } from "./api/authState";

const DEFAULT_MONTHLY_INCOME = 45000;

export interface ReportApiOptions extends Record<string, string | number | boolean | null | undefined> {
  period: "range" | "monthly";
  year?: number;
  month?: number;
  start?: string;
  end?: string;
  category_id?: string;
  type?: "income" | "expense";
}

export interface ReportCategoryOption {
  id: string;
  name: string;
  type: "income" | "expense";
}

function userToday(): { year: number; month: number; day: number } {
  const timezone = getAuthSnapshot().user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone, year: "numeric", month: "numeric", day: "numeric",
  }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function calendarShift(year: number, month: number, day: number, days: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function monthShift(year: number, month: number, offset: number) {
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

function dateKey(value: { year: number; month: number; day: number }): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}

function rangeFor(filters: ReportFilters): { start: string; end: string; label: string } {
  const today = userToday();
  let start: { year: number; month: number; day: number };
  let end: { year: number; month: number; day: number };
  let label: string;
  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    start = { year, month, day: 1 };
    const next = monthShift(year, month, 1);
    end = { ...next, day: 1 };
    label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  } else if (filters.range === "week") {
    start = calendarShift(today.year, today.month, today.day, -6);
    end = calendarShift(today.year, today.month, today.day, 1);
    label = "Last 7 days";
  } else if (filters.range === "lastMonth") {
    const previous = monthShift(today.year, today.month, -1);
    start = { ...previous, day: 1 };
    end = { year: today.year, month: today.month, day: 1 };
    label = new Date(Date.UTC(previous.year, previous.month - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  } else if (filters.range === "sixMonths") {
    const first = monthShift(today.year, today.month, -5);
    const next = monthShift(today.year, today.month, 1);
    start = { ...first, day: 1 };
    end = { ...next, day: 1 };
    label = "Last 6 calendar months";
  } else if (filters.range === "month") {
    const next = monthShift(today.year, today.month, 1);
    start = { year: today.year, month: today.month, day: 1 };
    end = { ...next, day: 1 };
    label = new Date(Date.UTC(today.year, today.month - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  } else {
    const first = monthShift(today.year, today.month, -11);
    const next = monthShift(today.year, today.month, 1);
    start = { ...first, day: 1 };
    end = { ...next, day: 1 };
    label = "Last 12 calendar months";
  }
  return { start: dateAtLocalTime(dateKey(start), 0), end: dateAtLocalTime(dateKey(end), 0), label };
}

export function reportApiOptions(filters: ReportFilters, categories: ReportCategoryOption[]): ReportApiOptions {
  const range = rangeFor(filters);
  const category = filters.source
    ? categories.find((item) => item.type === "income" && item.name === filters.source)
    : categories.find((item) => item.name === filters.category);
  return {
    period: "range",
    start: range.start,
    end: range.end,
    category_id: category?.id,
    type: filters.source ? "income" : filters.type === "all" ? undefined : filters.type,
  };
}

function reportTransactions(report: ApiReport, categories: Map<string, ApiCategory>): Transaction[] {
  return report.transactions.map((item) => ({
    id: item.id,
    categoryId: item.category_id,
    type: item.type,
    amount: moneyToNumber(item.amount),
    description: item.description,
    category: categories.get(item.category_id)?.name ?? "Unavailable category",
    date: calendarDate(item.occurred_at),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
}

function insightFromReports(current: ApiReport, previous: ApiReport): MonthlyInsight | null {
  if (current.transaction_count === 0) return null;
  const today = userToday();
  const month = new Date(Date.UTC(today.year, today.month - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric" });
  const expenses = moneyToNumber(current.expenses);
  const priorExpenses = moneyToNumber(previous.expenses);
  const balance = moneyToNumber(current.balance);
  const top = current.categories.find((item) => item.type === "expense");
  const change = priorExpenses === 0
    ? "There is no previous-month spending baseline yet."
    : expenses === priorExpenses
      ? "Expenses are unchanged from last month."
      : `Expenses are ${Math.round(Math.abs(expenses - priorExpenses) / priorExpenses * 100)}% ${expenses > priorExpenses ? "higher" : "lower"} than last month.`;
  return {
    id: `${today.year}-${String(today.month).padStart(2, "0")}`,
    month,
    summary: `You recorded ${formatNaira(moneyToNumber(current.income))} in income and ${formatNaira(expenses)} in expenses, leaving ${formatNaira(balance)}.`,
    change,
    suggestion: top
      ? `Review ${top.name}, your largest expense category this month at ${formatNaira(moneyToNumber(top.amount))}.`
      : "Keep recording transactions to make next month's comparison more useful.",
  };
}

async function getLiveReportData(filters: ReportFilters): Promise<ReportData> {
  const today = userToday();
  const months = Array.from({ length: 6 }, (_, index) => monthShift(today.year, today.month, index - 5));
  const previous = monthShift(today.year, today.month, -1);
  const categoriesResponse = await api.request<ApiCategory[]>("/categories");
  const categories = categoriesResponse.data.filter((item) => item.is_active);
  const options = reportApiOptions(filters, categories);
  const scopeOptions = reportApiOptions({ range: "all", month: "", category: "", type: "all", source: "" }, categories);
  const composition = { ...filters, range: "month" as const, month: "" };
  const currentOptions = reportApiOptions(composition, categories);
  const [selected, scope, current, prior, budgets, tips, ...history] = await Promise.all([
    api.request<ApiReport>("/reports", { query: options }),
    api.request<ApiReport>("/reports", { query: scopeOptions }),
    api.request<ApiReport>("/reports", { query: currentOptions }),
    api.request<ApiReport>("/reports", { query: { period: "monthly", year: previous.year, month: previous.month } }),
    listBudgets(),
    listTips(),
    ...months.map(({ year, month }) => api.request<ApiReport>("/reports", { query: { period: "monthly", year, month } })),
  ]);
  const categoryMap = new Map(categories.map((item) => [item.id, item]));
  const expenses = moneyToNumber(selected.data.expenses);
  const breakdown = selected.data.categories.filter((item) => item.type === "expense").map((item) => ({
    category: item.name,
    amount: moneyToNumber(item.amount),
    percentage: expenses === 0 ? 0 : moneyToNumber(item.amount) / expenses * 100,
  }));
  return {
    summary: {
      income: moneyToNumber(selected.data.income),
      expenses,
      net: moneyToNumber(selected.data.balance),
      savings: moneyToNumber(selected.data.balance),
      periodLabel: rangeFor(filters).label,
    },
    categories: breakdown,
    interpretation: buildInterpretation(breakdown, expenses),
    trend: history.map((response, index) => ({
      label: new Date(Date.UTC(months[index].year, months[index].month - 1, 1)).toLocaleDateString("en-NG", { month: "short" }),
      income: moneyToNumber(response.data.income),
      expenses: moneyToNumber(response.data.expenses),
    })),
    currentMonth: buildCurrentMonthReport(reportTransactions(current.data, categoryMap), today),
    insight: insightFromReports(history[history.length - 1].data, prior.data),
    pastInsights: [],
    tips,
    savedTips: tips.filter((tip) => tip.bookmarked),
    budgets,
    hasTransactions: scope.data.transaction_count > 0,
  };
}

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
function buildCurrentMonthReport(
  transactions: Transaction[],
  currentDate: { year: number; month: number; day: number } | null = null,
): CurrentMonthReport {
  const prefix = currentDate
    ? `${currentDate.year}-${String(currentDate.month).padStart(2, "0")}`
    : toISO(new Date()).slice(0, 7);
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
  const isCurrentMonth = currentDate !== null || prefix === toISO(today).slice(0, 7);
  const daysElapsed = isCurrentMonth ? currentDate?.day ?? today.getDate() : 0;
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
  if (DATA_MODE === "live") return getLiveReportData(filters);
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
