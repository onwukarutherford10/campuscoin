// Transaction store: the single source of truth for the dashboard, the
// transactions page and budget progress. The first read seeds the store from
// the student's onboarding answers so a new account starts personal.

import type { ServiceResult, Transaction, TransactionDraft } from "../types";
import { loadOnboardingData } from "../utils/storage";
import { delay, hasKey, loadJSON, newId, saveJSON } from "./store";

const TRANSACTIONS_KEY = "campuscoin.transactions";

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
export function listTransactions(): Promise<Transaction[]> {
  return delay([...readStore()].sort(byNewestFirst));
}

function validateDraft(draft: TransactionDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!draft.description.trim()) errors.description = "Add a short description.";
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) errors.amount = "Enter an amount greater than zero.";
  if (!draft.category.trim()) errors.category = "Choose a category.";
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

export function createTransaction(draft: TransactionDraft): Promise<ServiceResult<Transaction>> {
  const errors = validateDraft(draft);
  if (Object.keys(errors).length > 0) return Promise.resolve({ ok: false, errors });

  const now = new Date().toISOString();
  const transaction: Transaction = { id: newId("txn"), ...buildRecord(draft), createdAt: now, updatedAt: now };
  writeStore([...readStore(), transaction]);
  return delay({ ok: true, data: transaction });
}

export function updateTransaction(id: string, draft: TransactionDraft): Promise<ServiceResult<Transaction>> {
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

export function deleteTransaction(id: string): Promise<ServiceResult> {
  writeStore(readStore().filter((entry) => entry.id !== id));
  return delay({ ok: true });
}
