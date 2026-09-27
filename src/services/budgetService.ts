// Monthly budget store. Limits are user-set; spent is always computed from
// the current month's transactions so progress can never go stale.

import type { Budget, ServiceResult } from "../types";
import { loadOnboardingData } from "../utils/storage";
import { delay, hasKey, loadJSON, newId, saveJSON } from "./store";
import { readTransactionsSync } from "./transactionService";

const BUDGETS_KEY = "campuscoin.budgets";

const DEFAULT_SPENDING = ["Food", "Transport", "Academics"];
const DEFAULT_MONTHLY_INCOME = 45000;

// Share of monthly income suggested per category — seeds the first budgets.
const BUDGET_WEIGHTS: Record<string, number> = {
  Food: 0.28,
  Transport: 0.12,
  "Hostel/Rent": 0.25,
  Academics: 0.1,
  Subscriptions: 0.05,
  Entertainment: 0.08,
  Miscellaneous: 0.12,
};

interface StoredBudget {
  id: string;
  category: string;
  limit: number;
}

function roundTo500(amount: number): number {
  return Math.max(Math.round(amount / 500) * 500, 500);
}

function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Amount spent this month in a category (monthly budgets reset each month). */
function spentFor(category: string): number {
  const prefix = currentMonthPrefix();
  return readTransactionsSync()
    .filter((entry) => entry.type === "expense" && entry.category === category && entry.date.startsWith(prefix))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function seedBudgets(): StoredBudget[] {
  const profile = loadOnboardingData();
  const spending = profile.spendingCategories.length > 0 ? profile.spendingCategories : DEFAULT_SPENDING;
  const income = profile.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : DEFAULT_MONTHLY_INCOME;

  return spending.map((category) => {
    const suggested = income * (BUDGET_WEIGHTS[category] ?? 0.1);
    return {
      id: `budget-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      category,
      limit: Math.max(roundTo500(suggested), Math.ceil(spentFor(category) / 500) * 500),
    };
  });
}

function readStore(): StoredBudget[] {
  if (!hasKey(BUDGETS_KEY)) {
    const seeded = seedBudgets();
    saveJSON(BUDGETS_KEY, seeded);
    return seeded;
  }
  return loadJSON<StoredBudget[]>(BUDGETS_KEY, []);
}

function writeStore(budgets: StoredBudget[]): void {
  saveJSON(BUDGETS_KEY, budgets);
}

/** Synchronous read used by the category service for in-use checks. */
export function readBudgetsSync(): StoredBudget[] {
  return readStore();
}

function withSpent(budgets: StoredBudget[]): Budget[] {
  return budgets.map((budget) => ({ ...budget, spent: spentFor(budget.category) }));
}

/** All budgets enriched with the month's spending so far. */
export function listBudgets(): Promise<Budget[]> {
  return delay(withSpent(readStore()));
}

/** Creates a budget or updates an existing one (pass `id` when editing). */
export function saveBudget(input: { id?: string; category: string; limit: number }): Promise<ServiceResult<Budget>> {
  const category = input.category.trim();
  const errors: Record<string, string> = {};

  if (!category) errors.category = "Choose a category.";
  if (!Number.isFinite(input.limit) || input.limit <= 0) errors.limit = "Enter a monthly amount greater than zero.";
  if (!input.id && readStore().some((budget) => budget.category.toLowerCase() === category.toLowerCase())) {
    errors.category = "That category already has a budget. Edit it instead.";
  }

  if (Object.keys(errors).length > 0) {
    return Promise.resolve({ ok: false, errors });
  }

  const list = readStore();
  let saved: StoredBudget;

  if (input.id) {
    const index = list.findIndex((budget) => budget.id === input.id);
    if (index === -1) return Promise.resolve({ ok: false, error: "Budget not found." });
    saved = { ...list[index], category, limit: input.limit };
    const next = [...list];
    next[index] = saved;
    writeStore(next);
  } else {
    saved = { id: newId("budget"), category, limit: input.limit };
    writeStore([...list, saved]);
  }

  return delay({ ok: true, data: withSpent([saved])[0] });
}

export function removeBudget(id: string): Promise<ServiceResult> {
  writeStore(readStore().filter((budget) => budget.id !== id));
  return delay({ ok: true });
}
