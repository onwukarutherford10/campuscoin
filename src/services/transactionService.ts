// Transaction store: the single source of truth for the dashboard, the
// transactions page and budget progress. The first read seeds the store from
// the student's onboarding answers so a new account starts personal.

import type { Category, ServiceResult, Transaction, TransactionDraft } from "../types";
import { loadOnboardingData } from "../utils/storage";
import { delay, hasKey, loadJSON, newId, saveJSON } from "./store";
import { DATA_MODE } from "./api/config";
import { api } from "./api";
import type { ApiCategory, ApiRecurringRule, ApiTransaction, PageMeta } from "./api/dto";
import { moneyToNumber, numberToMoney } from "./api/adapters";
import { toServiceError } from "./api/errors";
import { getAuthSnapshot } from "./api/authState";

const TRANSACTIONS_KEY = "campuscoin.transactions";

export interface TransactionQuery {
  page?: number;
  perPage?: number;
  categoryId?: string;
  type?: "income" | "expense";
  from?: string;
  to?: string;
  query?: string;
}

export interface TransactionPage {
  items: Transaction[];
  meta: PageMeta;
}

function userTimezone(): string {
  return getAuthSnapshot().user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos";
}

export function dateAtLocalTime(date: string, hour: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: userTimezone(), year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(guess));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  return new Date(guess - (represented - guess)).toISOString();
}

export function calendarDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: userTimezone(), year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function transactionFromLive(
  value: ApiTransaction,
  categories: Map<string, ApiCategory>,
  rules: Map<string, ApiRecurringRule>,
): Transaction {
  const rule = value.recurring_rule_id ? rules.get(value.recurring_rule_id) : undefined;
  return {
    id: value.id,
    categoryId: value.category_id,
    type: value.type,
    amount: moneyToNumber(value.amount),
    description: value.description,
    category: categories.get(value.category_id)?.name ?? "Unavailable category",
    date: calendarDate(value.occurred_at),
    notes: value.notes ?? undefined,
    recurring: rule?.is_active === true,
    frequency: rule?.frequency,
    endDate: rule?.ends_at ? calendarDate(rule.ends_at) : undefined,
    recurringRuleId: value.recurring_rule_id,
    nextDueAt: rule?.next_due_at ?? null,
    recurrenceStatus: rule ? (rule.is_active ? "active" : "ended") : undefined,
    source: value.source,
    version: value.version,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

async function liveReferences(): Promise<{ categories: Map<string, ApiCategory>; rules: Map<string, ApiRecurringRule> }> {
  const [categoryResponse, ruleResponse] = await Promise.all([
    api.request<ApiCategory[]>("/categories"),
    api.request<ApiRecurringRule[]>("/recurring-transactions"),
  ]);
  return {
    categories: new Map(categoryResponse.data.map((category) => [category.id, category])),
    rules: new Map(ruleResponse.data.map((rule) => [rule.id, rule])),
  };
}

export async function listTransactionsPage(query: TransactionQuery = {}): Promise<TransactionPage> {
  if (DATA_MODE === "mock") {
    const categories = new Map(
      loadJSON<Category[]>("campuscoin.categories", []).map((category) => [category.id, category]),
    );
    const filtered = [...readStore()].sort(byNewestFirst).filter((transaction) => {
      if (query.type && transaction.type !== query.type) return false;
      if (query.categoryId && categories.get(query.categoryId)?.name !== transaction.category) return false;
      const occurred = new Date(`${transaction.date}T12:00:00`).toISOString();
      if (query.from && occurred < query.from) return false;
      if (query.to && occurred > query.to) return false;
      const text = query.query?.trim().toLowerCase();
      return !text || `${transaction.description} ${transaction.notes ?? ""}`.toLowerCase().includes(text);
    });
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 25;
    return {
      items: filtered.slice((page - 1) * perPage, page * perPage),
      meta: { page, per_page: perPage, total: filtered.length },
    };
  }
  const references = await liveReferences();
  const response = await api.request<ApiTransaction[], PageMeta>("/transactions", {
    query: {
      page: query.page ?? 1,
      per_page: query.perPage ?? 25,
      category_id: query.categoryId,
      type: query.type,
      from: query.from,
      to: query.to,
      q: query.query?.trim() || undefined,
    },
  });
  return {
    items: response.data.map((transaction) => transactionFromLive(transaction, references.categories, references.rules)),
    meta: response.meta,
  };
}

const DEFAULT_SPENDING = ["Food", "Transport", "Academics"];
const DEFAULT_INCOME = ["Allowance", "Part-time job"];

// Typical entries per chosen category, so a fresh profile shows real activity.
const EXPENSE_TEMPLATES: Record<string, { description: string; amount: number }[]> = {
  Food: [
    { description: "Campus Cafe", amount: 2500 },
    { description: "Groceries run", amount: 6400 },
    { description: "Late night snacks", amount: 1500 },
  ],
  Transport: [
    { description: "Bus to campus", amount: 700 },
    { description: "Transport share", amount: 2200 },
  ],
  "Hostel/Rent": [{ description: "Hostel payment", amount: 3000 }],
  Academics: [
    { description: "Lab manual", amount: 1800 },
    { description: "Printing & handouts", amount: 900 },
  ],
  Subscriptions: [{ description: "Music subscription", amount: 1600 }],
  Entertainment: [{ description: "Movie night", amount: 1050 }],
  Miscellaneous: [{ description: "Laundry", amount: 1200 }],
};

const INCOME_TEMPLATES: Record<string, { description: string; amount: number }> = {
  Allowance: { description: "Allowance", amount: 48000 },
  "Part-time job": { description: "Weekend shift", amount: 12000 },
  Scholarship: { description: "Scholarship disbursement", amount: 25000 },
  "Gig or freelance work": { description: "Design gig", amount: 9000 },
  Gifts: { description: "Birthday gift", amount: 5000 },
  "Other income": { description: "Odd jobs", amount: 4000 },
};

function dayOffsetISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function seedFromProfile(): Transaction[] {
  const profile = loadOnboardingData();
  const spending = profile.spendingCategories.length > 0 ? profile.spendingCategories : DEFAULT_SPENDING;
  const incomeSources = profile.incomeSources.length > 0 ? profile.incomeSources : DEFAULT_INCOME;
  const now = new Date().toISOString();
  const transactions: Transaction[] = [];
  let day = 0;

  for (const source of incomeSources) {
    const template = INCOME_TEMPLATES[source];
    if (!template) continue;
    transactions.push({
      id: `inc-${source}`,
      type: "income",
      description: template.description,
      amount: template.amount,
      category: source,
      date: dayOffsetISO(day + 5),
      createdAt: now,
      updatedAt: now,
    });
    day += 1;
  }

  for (const category of spending) {
    for (const template of EXPENSE_TEMPLATES[category] ?? []) {
      transactions.push({
        id: `exp-${category}-${template.description}`,
        type: "expense",
        description: template.description,
        amount: template.amount,
        category,
        date: dayOffsetISO(day),
        createdAt: now,
        updatedAt: now,
      });
      day += 1;
    }
  }

  return transactions;
}

function readStore(): Transaction[] {
  if (!hasKey(TRANSACTIONS_KEY)) {
    const seeded = seedFromProfile();
    saveJSON(TRANSACTIONS_KEY, seeded);
    return seeded;
  }
  return loadJSON<Transaction[]>(TRANSACTIONS_KEY, []);
}

function writeStore(transactions: Transaction[]): void {
  saveJSON(TRANSACTIONS_KEY, transactions);
}

function byNewestFirst(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  return b.createdAt.localeCompare(a.createdAt);
}

/** Synchronous read used by budget/category services for their own maths. */
export function readTransactionsSync(): Transaction[] {
  return readStore();
}

/** All transactions, newest first. */
export async function listTransactions(): Promise<Transaction[]> {
  if (DATA_MODE === "live") return (await listTransactionsPage({ perPage: 100 })).items;
  return delay([...readStore()].sort(byNewestFirst));
}

async function livePayload(draft: TransactionDraft) {
  const categories = await api.request<ApiCategory[]>("/categories");
  const category = categories.data.find(
    (entry) => entry.is_active && entry.type === draft.type && entry.id === draft.categoryId,
  );
  if (!category) throw { fieldError: "Choose an active category from the list." };
  return {
    category,
    body: {
      category_id: category.id,
      transaction_type: draft.type,
      amount: numberToMoney(draft.amount),
      description: draft.description.trim(),
      notes: draft.notes?.trim() || null,
      occurred_at: dateAtLocalTime(draft.date, 12),
    },
  };
}

function mapLiveFailure(error: unknown): ServiceResult<Transaction> {
  if (typeof error === "object" && error !== null && "fieldError" in error) {
    return { ok: false, errors: { category: String(error.fieldError) } };
  }
  const failure = toServiceError(error);
  const errors = { ...failure.errors };
  if (errors.category_id) errors.category = errors.category_id;
  if (errors.occurred_at) errors.date = errors.occurred_at;
  return { ...failure, errors };
}

function validateDraft(draft: TransactionDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.description.trim()) errors.description = "Add a short description.";
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.amount = "Enter an amount greater than zero.";
  if (!draft.category.trim() || (DATA_MODE === "live" && !draft.categoryId)) errors.category = "Choose a category.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || Number.isNaN(Date.parse(draft.date))) {
    errors.date = "Pick a valid date.";
  }
  if (draft.recurring && draft.endDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) || Number.isNaN(Date.parse(draft.endDate))) {
      errors.endDate = "Pick a valid end date.";
    } else if (draft.endDate < draft.date) {
      errors.endDate = "The end date can't come before the start date.";
    }
  }

  return errors;
}

function buildRecord(draft: TransactionDraft): Omit<Transaction, "id" | "createdAt" | "updatedAt"> {
  const recurring = draft.recurring === true;
  return {
    type: draft.type,
    description: draft.description.trim(),
    amount: draft.amount,
    category: draft.category.trim(),
    date: draft.date,
    notes: draft.notes?.trim() || undefined,
    recurring: recurring || undefined,
    frequency: recurring ? (draft.frequency ?? "monthly") : undefined,
    endDate: recurring ? (draft.endDate ?? null) : undefined,
  };
}

export async function createTransaction(draft: TransactionDraft): Promise<ServiceResult<Transaction>> {
  if (DATA_MODE === "live") {
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    try {
      const { category, body } = await livePayload(draft);
      if (draft.recurring) {
        const response = await api.request<ApiRecurringRule>("/recurring-transactions", {
          method: "POST",
          body: {
            category_id: body.category_id, transaction_type: body.transaction_type,
            amount: body.amount, description: body.description, notes: body.notes,
            next_due_at: body.occurred_at,
            frequency: draft.frequency ?? "monthly",
            interval: 1,
            ends_at: draft.endDate ? dateAtLocalTime(draft.endDate, 23) : null,
          },
        });
        const now = new Date().toISOString();
        return { ok: true, data: {
          id: response.data.id, categoryId: category.id, type: draft.type, amount: draft.amount,
          description: draft.description.trim(), category: category.name, date: draft.date,
          notes: draft.notes?.trim() || undefined, recurring: true, frequency: draft.frequency ?? "monthly",
          endDate: draft.endDate, recurringRuleId: response.data.id, source: "recurring",
          recurrenceStatus: "active",
          createdAt: now, updatedAt: now,
        } };
      }
      const response = await api.request<ApiTransaction>("/transactions", { method: "POST", body });
      return { ok: true, data: transactionFromLive(response.data, new Map([[category.id, category]]), new Map()) };
    } catch (error) {
      return mapLiveFailure(error);
    }
  }
  const errors = validateDraft(draft);
  if (Object.keys(errors).length > 0) return Promise.resolve({ ok: false, errors });

  const now = new Date().toISOString();
  const transaction: Transaction = { id: newId("txn"), ...buildRecord(draft), createdAt: now, updatedAt: now };
  writeStore([...readStore(), transaction]);
  return delay({ ok: true, data: transaction });
}

export async function updateTransaction(id: string, draft: TransactionDraft): Promise<ServiceResult<Transaction>> {
  if (DATA_MODE === "live") {
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    try {
      const { category, body } = await livePayload(draft);
      const transactionResponse = await api.request<ApiTransaction>(`/transactions/${id}`, {
        method: "PATCH", body,
      });
      let rule: ApiRecurringRule | undefined;
      if (draft.recurringRuleId && draft.recurring) {
        const recurrenceChanges = {
          category_id: category.id, transaction_type: draft.type, amount: body.amount,
          description: body.description, notes: body.notes, frequency: draft.frequency ?? "monthly",
          is_active: true,
          ...(draft.endDate !== draft.previousEndDate
            ? { ends_at: draft.endDate ? dateAtLocalTime(draft.endDate, 23) : null }
            : {}),
        };
        const response = await api.request<ApiRecurringRule>(`/recurring-transactions/${draft.recurringRuleId}`, {
          method: "PATCH",
          body: recurrenceChanges,
        });
        rule = response.data;
      } else if (draft.recurringRuleId && !draft.recurring) {
        await api.request(`/recurring-transactions/${draft.recurringRuleId}`, { method: "DELETE" });
      } else if (!draft.recurringRuleId && draft.recurring) {
        const next = new Date(dateAtLocalTime(draft.date, 12));
        if ((draft.frequency ?? "monthly") === "daily") next.setUTCDate(next.getUTCDate() + 1);
        else if ((draft.frequency ?? "monthly") === "weekly") next.setUTCDate(next.getUTCDate() + 7);
        else next.setUTCMonth(next.getUTCMonth() + 1);
        const response = await api.request<ApiRecurringRule>("/recurring-transactions", {
          method: "POST",
          body: {
            category_id: body.category_id, transaction_type: body.transaction_type,
            amount: body.amount, description: body.description, notes: body.notes,
            next_due_at: next.toISOString(), frequency: draft.frequency ?? "monthly", interval: 1,
            ends_at: draft.endDate ? dateAtLocalTime(draft.endDate, 23) : null,
          },
        });
        rule = response.data;
      }
      const mapped = transactionFromLive(
        transactionResponse.data,
        new Map([[category.id, category]]),
        rule ? new Map([[rule.id, rule]]) : new Map(),
      );
      return { ok: true, data: { ...mapped, recurring: draft.recurring, frequency: draft.recurring ? draft.frequency : undefined, endDate: draft.recurring ? draft.endDate : undefined } };
    } catch (error) {
      return mapLiveFailure(error);
    }
  }
  const errors = validateDraft(draft);
  if (Object.keys(errors).length > 0) return Promise.resolve({ ok: false, errors });

  const list = readStore();
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return Promise.resolve({ ok: false, error: "Transaction not found." });

  const updated: Transaction = {
    ...list[index],
    ...buildRecord(draft),
    updatedAt: new Date().toISOString(),
  };
  const next = [...list];
  next[index] = updated;
  writeStore(next);
  return delay({ ok: true, data: updated });
}

export async function deleteTransaction(id: string): Promise<ServiceResult> {
  if (DATA_MODE === "live") {
    try {
      await api.request(`/transactions/${id}`, { method: "DELETE" });
      return { ok: true };
    } catch (error) {
      return toServiceError(error);
    }
  }
  writeStore(readStore().filter((entry) => entry.id !== id));
  return delay({ ok: true });
}
