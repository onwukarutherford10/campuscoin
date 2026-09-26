// Category store: seeded system defaults plus the student's own categories.

import type { Category, ServiceResult, TransactionType } from "../types";
import { delay, hasKey, loadJSON, newId, saveJSON } from "./store";
import { readBudgetsSync } from "./budgetService";
import { readTransactionsSync } from "./transactionService";

const CATEGORIES_KEY = "campuscoin.categories";

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Hostel/Rent",
  "Academics",
  "Subscriptions",
  "Entertainment",
  "Miscellaneous",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Allowance",
  "Part-time job",
  "Scholarship",
  "Gig or freelance work",
  "Gifts",
  "Other income",
];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function systemCategory(name: string, type: TransactionType): Category {
  return { id: `cat-${type}-${slug(name)}`, name, type, color: null, icon: null, isSystem: true };
}

function seedCategories(): Category[] {
  return [
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => systemCategory(name, "expense")),
    ...DEFAULT_INCOME_CATEGORIES.map((name) => systemCategory(name, "income")),
  ];
}

function readStore(): Category[] {
  if (!hasKey(CATEGORIES_KEY)) {
    const seeded = seedCategories();
    saveJSON(CATEGORIES_KEY, seeded);
    return seeded;
  }
  return loadJSON<Category[]>(CATEGORIES_KEY, []);
}

function writeStore(categories: Category[]): void {
  saveJSON(CATEGORIES_KEY, categories);
}

/** All categories (seeded defaults first, then personal ones). */
export function listCategories(): Promise<Category[]> {
  return delay(readStore());
}

/** Synchronous read for services that must check names inline. */
export function readCategoriesSync(): Category[] {
  return readStore();
}

export function createCategory(input: {
  name: string;
  type: TransactionType;
  icon?: string | null;
}): Promise<ServiceResult<Category>> {
  const name = input.name.trim();
  const errors: Record<string, string> = {};

  if (!name) {
    errors.name = "Give the category a name.";
  } else if (name.length > 80) {
    errors.name = "Keep the name under 80 characters.";
  } else if (
    readStore().some(
      (category) => category.type === input.type && category.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    errors.name = "You already have a category with that name.";
  }

  if (Object.keys(errors).length > 0) {
    return Promise.resolve({ ok: false, errors });
  }

  const category: Category = {
    id: newId("cat"),
    name,
    type: input.type,
    color: null,
    icon: input.icon ?? null,
    isSystem: false,
  };
  writeStore([...readStore(), category]);
  return delay({ ok: true, data: category });
}

/** Deletes a personal category; defaults and categories in use are blocked. */
export function deleteCategory(id: string): Promise<ServiceResult> {
  const category = readStore().find((entry) => entry.id === id);
  if (!category) return Promise.resolve({ ok: false, error: "Category not found." });
  if (category.isSystem) return Promise.resolve({ ok: false, error: "Default categories can't be deleted." });

  const usedByTransactions = readTransactionsSync().some((entry) => entry.category === category.name);
  const usedByBudget = readBudgetsSync().some((entry) => entry.category === category.name);
  if (usedByTransactions || usedByBudget) {
    return Promise.resolve({
      ok: false,
      error: "This category is in use by a transaction or budget. Remove those first.",
    });
  }

  writeStore(readStore().filter((entry) => entry.id !== id));
  return delay({ ok: true });
}

/**
 * Renames a personal category and/or swaps its icon. Defaults stay
 * immutable, and a name that is referenced by transactions or budgets is
 * protected (renaming would orphan those records).
 */
export function updateCategory(
  id: string,
  input: { name?: string; icon?: string | null },
): Promise<ServiceResult<Category>> {
  const store = readStore();
  const category = store.find((entry) => entry.id === id);
  if (!category) return Promise.resolve({ ok: false, error: "Category not found." });
  if (category.isSystem) return Promise.resolve({ ok: false, error: "Default categories can't be changed." });

  const errors: Record<string, string> = {};
  const name = input.name?.trim() ?? category.name;

  if (!name) {
    errors.name = "Give the category a name.";
  } else if (name.length > 80) {
    errors.name = "Keep the name under 80 characters.";
  } else if (
    store.some(
      (entry) => entry.id !== id && entry.type === category.type && entry.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    errors.name = "You already have a category with that name.";
  }

  if (!errors.name && name !== category.name) {
    const usedByTransactions = readTransactionsSync().some((entry) => entry.category === category.name);
    const usedByBudget = readBudgetsSync().some((entry) => entry.category === category.name);
    if (usedByTransactions || usedByBudget) {
      errors.name = "That category is in use by a transaction or budget; you can still change its icon.";
    }
  }

  if (Object.keys(errors).length > 0) {
    return Promise.resolve({ ok: false, errors });
  }

  const updated: Category = {
    ...category,
    name,
    icon: input.icon === undefined ? category.icon : input.icon,
  };
  writeStore(store.map((entry) => (entry.id === id ? updated : entry)));
  return delay({ ok: true, data: updated });
}
