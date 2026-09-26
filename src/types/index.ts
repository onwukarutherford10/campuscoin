// Shared data models for Campus Coin.
// Components never talk to the data layer directly; they consume these types.

export type AcademicLevel =
  | "100 Level"
  | "200 Level"
  | "300 Level"
  | "400 Level"
  | "Postgraduate"
  | "Other";

export type IncomeSource =
  | "Allowance"
  | "Part-time job"
  | "Scholarship"
  | "Gig or freelance work"
  | "Gifts"
  | "Other income";

export type SpendingCategory =
  | "Food"
  | "Transport"
  | "Hostel/Rent"
  | "Academics"
  | "Subscriptions"
  | "Entertainment"
  | "Miscellaneous";

export interface OnboardingData {
  fullName: string;
  academicLevel: AcademicLevel | "";
  incomeSources: IncomeSource[];
  monthlyIncome: number | null;
  savingsGoal: number | null;
  spendingCategories: SpendingCategory[];
  completed: boolean;
}

export type TransactionType = "income" | "expense";

export type RecurrenceFrequency = "weekly" | "monthly";

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  /** Category name — the shared key between transactions, categories and budgets. */
  category: string;
  /** Calendar date as yyyy-mm-dd. */
  date: string;
  notes?: string;
  recurring?: boolean;
  frequency?: RecurrenceFrequency;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload accepted when creating or editing a transaction. */
export interface TransactionDraft {
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  recurring?: boolean;
  frequency?: RecurrenceFrequency;
  endDate?: string | null;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  /** Seeded defaults cannot be renamed or deleted. */
  isSystem: boolean;
}

/** Offline classification result; `source` marks where it came from. */
export interface CategorySuggestion {
  category: string;
  source: "rules" | "ai";
  /**
   * "high" = a previous correction for this exact description (auto-select),
   * "medium" = keyword rules or learned words (shown as a suggestion).
   */
  confidence: "high" | "medium";
}

/** Outcome of a service mutation: either data or field-keyed error messages. */
export interface ServiceResult<T = void> {
  ok: boolean;
  data?: T;
  errors?: Record<string, string>;
  error?: string;
}

export interface FinancialSummary {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  savingsGoal: number | null;
  period: string;
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
}

export interface SpendingOverview {
  totalExpenses: number;
  topCategory: string;
  categories: CategorySpending[];
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

export interface SavingTip {
  id: string;
  title: string;
  body: string;
}

export interface TrendPoint {
  label: string;
  income: number;
  expenses: number;
}

export interface DashboardData {
  summary: FinancialSummary;
  transactions: Transaction[];
  spending: SpendingOverview;
  budgets: Budget[];
  tip: SavingTip | null;
  /** One plain-language key insight; the full analysis lives on Reports. */
  insight: string | null;
  trend: TrendPoint[];
}

/* ------------------------------------------------------------------ *
 * Phase 3: reports, insights, tips, CSV import                        *
 * ------------------------------------------------------------------ */

/** Which slice of history the reports page is looking at. */
export type ReportRange = "all" | "week" | "month" | "lastMonth" | "sixMonths";

export interface ReportFilters {
  range: ReportRange;
  /** Month key as yyyy-mm, or "" for every month in the range. */
  month: string;
  category: string;
  type: "all" | TransactionType;
  /** Income source (category name), or "". */
  source: string;
}

export interface ReportSummary {
  income: number;
  expenses: number;
  net: number;
  savings: number;
  periodLabel: string;
}

export interface DailySpend {
  /** yyyy-mm-dd within the current month. */
  date: string;
  amount: number;
}

export interface WeeklySpend {
  label: string;
  amount: number;
}

export interface CurrentMonthReport {
  days: DailySpend[];
  weeks: WeeklySpend[];
  averageDaily: number;
  highestDay: DailySpend | null;
  highestWeek: WeeklySpend | null;
  /** One human sentence, or null when the data can't support a conclusion. */
  context: string | null;
}

/** Plain-language monthly review produced by the insight engine. */
export interface MonthlyInsight {
  /** Month key as yyyy-mm. */
  id: string;
  month: string;
  summary: string;
  change: string;
  suggestion: string;
}

export interface ReportData {
  summary: ReportSummary;
  categories: CategorySpending[];
  interpretation: string | null;
  trend: TrendPoint[];
  currentMonth: CurrentMonthReport;
  insight: MonthlyInsight | null;
  pastInsights: MonthlyInsight[];
  tips: SavingTip[];
  savedTips: SavingTip[];
  budgets: Budget[];
  /** False when the store has nothing to report on at all. */
  hasTransactions: boolean;
}

/** One parsed CSV line in the import preview; errors block only that row. */
export interface ImportRow {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: TransactionType;
  /** Raw text from the type column when it wasn't income/expense. */
  rawType?: string;
  category: string;
  /** Set when the category came from the suggestion engine. */
  suggested?: boolean;
  errors: Record<string, string>;
}

/** Signed-in account details editable from the profile screen. */
export interface UserProfile {
  fullName: string;
  email: string;
  /** Avatar as a data URL, or null when the initials monogram is shown. */
  avatar: string | null;
}
