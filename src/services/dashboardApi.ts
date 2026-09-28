import type { DashboardData, OnboardingData, SpendingOverview, Transaction } from "../types";
import { listBudgets } from "./budgetService";
import { listTransactions, calendarDate } from "./transactionService";
import { getMonthlyInsight } from "./insightService";
import { getDashboardTip } from "./tipsService";
import { buildSixMonthTrend } from "./trend";
import { DATA_MODE } from "./api/config";
import { api } from "./api";
import type { ApiCategory, ApiDashboard, ApiNotification, ApiReport, ApiTransaction } from "./api/dto";
import { budgetFromApi, moneyToNumber } from "./api/adapters";
import { getAuthSnapshot } from "./api/authState";

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
  return { totalExpenses, topCategory: categories[0]?.category ?? "", categories };
}

function conciseInsight(insight: { summary: string; change: string } | null): string | null {
  if (!insight) return null;
  const specific = !insight.change.startsWith("Spending stayed") && !insight.change.startsWith("There is no earlier");
  return specific ? insight.change : insight.summary;
}

function currentPeriod(): { year: number; month: number } {
  const timezone = getAuthSnapshot().user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "numeric" }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month") };
}

function recentTransaction(value: ApiTransaction, categories: Map<string, ApiCategory>): Transaction {
  return {
    id: value.id,
    categoryId: value.category_id,
    type: value.type,
    amount: moneyToNumber(value.amount),
    description: value.description,
    category: categories.get(value.category_id)?.name ?? "Unavailable category",
    date: calendarDate(value.occurred_at),
    notes: value.notes ?? undefined,
    recurring: Boolean(value.recurring_rule_id),
    recurringRuleId: value.recurring_rule_id,
    source: value.source,
    version: value.version,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function priorMonths(year: number, month: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const serial = year * 12 + month - 1 - (5 - index);
    const itemYear = Math.floor(serial / 12);
    const itemMonth = serial % 12 + 1;
    return {
      year: itemYear,
      month: itemMonth,
      label: new Intl.DateTimeFormat("en-NG", { month: "short" }).format(new Date(Date.UTC(itemYear, itemMonth - 1, 1))),
    };
  });
}

async function getLiveDashboardData(): Promise<DashboardData> {
  const period = currentPeriod();
  const months = priorMonths(period.year, period.month);
  const [dashboardResponse, categoryResponse, ...reportResponses] = await Promise.all([
    api.request<ApiDashboard>("/dashboard"),
    api.request<ApiCategory[]>("/categories"),
    ...months.map(({ year, month }) => api.request<ApiReport>("/reports", { query: { period: "monthly", year, month } })),
  ]);
  const dashboard = dashboardResponse.data;
  const categoriesById = new Map(categoryResponse.data.map((category) => [category.id, category]));
  const expenseCategories = dashboard.top_categories.filter((category) => category.type === "expense");
  const totalExpenses = moneyToNumber(dashboard.expenses);
  const user = getAuthSnapshot().user;
  const savingsGoal = user ? moneyToNumber(user.savings_goal) : 0;

  return {
    summary: {
      balance: moneyToNumber(dashboard.balance),
      income: moneyToNumber(dashboard.income),
      expenses: totalExpenses,
      savings: moneyToNumber(dashboard.balance),
      savingsGoal: savingsGoal > 0 ? savingsGoal : null,
      period: new Date(Date.UTC(period.year, period.month - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric" }),
    },
    transactions: dashboard.recent_activity.map((item) => recentTransaction(item, categoriesById)),
    spending: {
      totalExpenses,
      topCategory: expenseCategories[0]?.name ?? "",
      categories: expenseCategories.map((category) => ({
        category: category.name,
        amount: moneyToNumber(category.amount),
        percentage: totalExpenses === 0 ? 0 : moneyToNumber(category.amount) / totalExpenses * 100,
      })),
    },
    budgets: dashboard.budgets.map(budgetFromApi),
    tip: dashboard.tips[0] ? {
      id: dashboard.tips[0].key,
      title: "A way to save",
      body: dashboard.tips[0].message,
      estimatedSavings: moneyToNumber(dashboard.tips[0].estimated_savings),
      pinned: dashboard.tips[0].pinned,
      bookmarked: dashboard.tips[0].bookmarked,
    } : null,
    insight: null,
    trend: reportResponses.map((response, index) => ({
      label: months[index].label,
      income: moneyToNumber(response.data.income),
      expenses: moneyToNumber(response.data.expenses),
    })),
    alerts: dashboard.alerts.filter((alert) => !alert.dismissed_at).map((alert) => ({
      id: alert.id,
      kind: alert.kind,
      message: alert.message,
      createdAt: alert.created_at,
      readAt: alert.read_at,
    })),
  };
}

export async function markNotificationRead(id: string): Promise<ApiNotification> {
  return (await api.request<ApiNotification>(`/notifications/${id}/read`, { method: "POST", body: {} })).data;
}

export async function dismissNotification(id: string): Promise<ApiNotification> {
  return (await api.request<ApiNotification>(`/notifications/${id}/dismiss`, { method: "POST", body: {} })).data;
}

export async function getDashboardData(profile: OnboardingData | null): Promise<DashboardData> {
  if (DATA_MODE === "live") return getLiveDashboardData();
  if (!profile) throw new Error("Mock dashboard requires onboarding data");

  const [transactions, budgets, tip, insight] = await Promise.all([
    listTransactions(),
    listBudgets(),
    getDashboardTip(),
    getMonthlyInsight(),
  ]);
  const totalIncome = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const spending = buildSpendingOverview(transactions);
  const monthlyIncome = profile.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : DEFAULT_MONTHLY_INCOME;

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
    alerts: [],
  };
}
