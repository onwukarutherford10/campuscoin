/** API transport shapes. Decimal amounts remain strings until a UI adapter uses them. */
export type Money = string;
export type TransactionType = "income" | "expense";

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  academic_year: string | null;
  allowance_baseline: Money;
  savings_goal: Money;
  currency: string;
  timezone: string;
  ai_consent: boolean;
  role: "student" | "admin";
  is_active: boolean;
}

export interface ApiCategory {
  id: string;
  name: string;
  type: TransactionType;
  color: string | null;
  icon: string | null;
  is_system: boolean;
  is_active: boolean;
}

export interface ApiTransaction {
  id: string;
  category_id: string;
  type: TransactionType;
  amount: Money;
  description: string;
  merchant: string | null;
  occurred_at: string;
  source: string;
  deleted_at: string | null;
  recurring_rule_id: string | null;
  version: number;
}

export interface ApiBudget {
  id: string;
  category_id: string;
  category_name: string;
  year: number;
  month: number;
  amount: Money;
  spent: Money;
  remaining: Money;
  percent: string;
  status: "within_limit" | "near_limit" | "exceeded";
  near_limit_percent: number;
  version: number;
}

export interface ApiTip {
  key: string;
  message: string;
  estimated_savings: Money;
  pinned: boolean;
  bookmarked: boolean;
  dismissed: boolean;
}

export interface ApiNotification {
  id: string;
  kind: string;
  message: string;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export interface ApiReportCategory {
  type: TransactionType;
  category_id: string;
  name: string;
  amount: Money;
}

export interface ApiReport {
  period: string;
  from: string;
  to: string;
  currency: string;
  income: Money;
  expenses: Money;
  balance: Money;
  transaction_count: number;
  categories: ApiReportCategory[];
  recent_activity: ApiTransaction[];
  transactions: ApiTransaction[];
}

export interface ApiDashboard {
  currency: string;
  balance: Money;
  income: Money;
  expenses: Money;
  top_categories: ApiReportCategory[];
  budgets: ApiBudget[];
  tips: ApiTip[];
  alerts: ApiNotification[];
  recent_activity: ApiTransaction[];
}

export interface ApiImportPreview {
  import_id: string;
  status: string;
  filename: string;
  row_count: number;
  valid_count: number;
  duplicate_count: number;
  error_count: number;
  expires_at: string;
  preview: Array<Record<string, unknown>>;
  errors_url: string | null;
}

export interface ApiJob {
  job_id: string;
  type: string;
  status: string;
  status_url: string;
  result: { download_url?: string; export_id?: string } | null;
  error: string | null;
}

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
}
