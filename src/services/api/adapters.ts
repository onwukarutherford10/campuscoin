import type { Budget, Category, UserProfile } from "../../types";
import type { ApiBudget, ApiCategory, ApiTransaction, ApiUser, Money } from "./dto.ts";

/** Convert an API amount only for UI arithmetic; reject malformed or unsafe values. */
export function moneyToNumber(value: Money): number {
  if (!/^-?\d+\.\d{2}$/.test(value)) throw new Error("Invalid API money value");
  const amount = Number(value);
  if (!Number.isSafeInteger(Math.round(amount * 100))) throw new Error("API money value exceeds safe UI range");
  return amount;
}

export function numberToMoney(value: number): Money {
  const cents = Math.round(value * 100);
  if (!Number.isFinite(value) || !Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 1e-7) {
    throw new Error("Invalid money value");
  }
  return (cents / 100).toFixed(2);
}

export function categoryFromApi(value: ApiCategory): Category {
  return {
    id: value.id,
    name: value.name,
    type: value.type,
    color: value.color,
    icon: value.icon,
    isSystem: value.is_system,
  };
}

export function budgetFromApi(value: ApiBudget): Budget {
  return {
    id: value.id,
    categoryId: value.category_id,
    category: value.category_name,
    limit: moneyToNumber(value.amount),
    spent: moneyToNumber(value.spent),
    remaining: moneyToNumber(value.remaining),
    percentage: Number(value.percent),
    status: value.status,
    year: value.year,
    month: value.month,
    nearLimitPercent: value.near_limit_percent,
    version: value.version,
  };
}

export function profileFromApi(value: ApiUser): UserProfile {
  return { fullName: value.name, email: value.email, avatar: value.avatar_url };
}

/** Keep API-only ledger fields intact until the transaction UI is migrated. */
export function transactionFromApi(value: ApiTransaction) {
  return {
    id: value.id,
    categoryId: value.category_id,
    type: value.type,
    amount: moneyToNumber(value.amount),
    description: value.description,
    merchant: value.merchant,
    notes: value.notes ?? undefined,
    occurredAt: value.occurred_at,
    source: value.source,
    deletedAt: value.deleted_at,
    recurringRuleId: value.recurring_rule_id,
    version: value.version,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}
