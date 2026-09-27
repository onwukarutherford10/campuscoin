// Personalised saving tips engine (Phase 3, sections 13–15).
//
// Rules run over real transaction/budget data, score their potential impact
// and return only a handful of high-value tips. Dismissed tips stay hidden;
// bookmarked tips are snapshotted so they survive rule changes.

import type { Budget, OnboardingData, SavingTip, Transaction } from "../types";
import { loadOnboardingData } from "../utils/storage";
import { listBudgets } from "./budgetService";
import { readTransactionsSync } from "./transactionService";
import { delay, loadJSON, saveJSON } from "./store";
import { formatNaira, formatPercent } from "../utils/format";
import { recentAverageExpenses } from "./trend";

const STATE_KEY = "campuscoin.tipState";

interface RankedTip extends SavingTip {
  id: string;
  score: number;
}

interface TipState {
  saved: SavingTip[];
  dismissed: string[];
}

function readState(): TipState {
  const state = loadJSON<Partial<TipState>>(STATE_KEY, {});
  return { saved: state.saved ?? [], dismissed: state.dismissed ?? [] };
}

function writeState(state: TipState): void {
  saveJSON(STATE_KEY, state);
}

function sumOf(transactions: Transaction[], type: Transaction["type"]): number {
  return transactions
    .filter((entry) => entry.type === type)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

function expenseByCategory(transactions: Transaction[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of transactions) {
    if (item.type !== "expense") continue;
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount);
  }
  return totals;
}

/** Pure rule set: data in, ranked tips out. Exported for easy testing. */
export function buildTips(
  transactions: Transaction[],
  budgets: Budget[],
  profile: OnboardingData,
): RankedTip[] {
  const expenses = sumOf(transactions, "expense");
  const income = sumOf(transactions, "income");
  if (expenses === 0) return [];

  const byCategory = expenseByCategory(transactions);
  const tips: RankedTip[] = [];

  // 1. Budget risk — the most urgent signal.
  for (const budget of budgets) {
    const percentage = budget.limit === 0 ? 0 : (budget.spent / budget.limit) * 100;
    if (percentage < 80) continue;
    const over = budget.spent - budget.limit;
    tips.push({
      id: `budget-${budget.category}`,
      title: "Budget watch",
      body:
        over > 0
          ? `Your ${budget.category} spending is ${formatNaira(over)} over its monthly budget. You may want to review those entries.`
          : `You're close to your ${budget.category} budget, at ${formatPercent(percentage)} used. One option could be keeping the remaining ${formatNaira(budget.limit - budget.spent)} for the rest of the month.`,
      score: 100 + percentage,
    });
  }

  // 2. Spending above the recent average.
  const incomeBase =
    profile.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : 45000;
  const baseline = recentAverageExpenses(incomeBase);
  if (baseline > 0 && expenses > baseline * 1.1) {
    const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
    tips.push({
      id: "above-average",
      title: "Spending above your average",
      body: `You spent more this month than your recent average, with ${top ? top[0] : "one category"} leading. Consider setting a weekly target for it.`,
      score: 90 + ((expenses - baseline) / baseline) * 50,
    });
  }

  // 3. A growing subscription share.
  const subscriptions = byCategory.get("Subscriptions") ?? 0;
  if (subscriptions > 0 && subscriptions / expenses >= 0.1) {
    tips.push({
      id: "subscriptions",
      title: "Review subscriptions",
      body: "Your subscriptions account for a growing part of monthly spending. Review subscriptions you rarely use.",
      score: 75,
    });
  }

  // 4. Savings goal behind.
  const savingsGoal = profile.savingsGoal;
  if (savingsGoal && savingsGoal > 0 && income - expenses < savingsGoal) {
    tips.push({
      id: "savings-goal",
      title: "Savings target",
      body: "You're currently below your monthly savings target. A small reduction in one spending category could help close the gap.",
      score: 70,
    });
  }

  // 5. One category dominating the month.
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] / expenses >= 0.45) {
    const share = Math.round((top[1] / expenses) * 100);
    tips.push({
      id: "top-category",
      title: "One category dominates",
      body: `${top[0]} makes up ${share}% of this month's spending. One option could be a small weekly cap on ${top[0]}.`,
      score: 60 + share / 10,
    });
  }

  return tips.sort((a, b) => b.score - a.score).slice(0, 4);
}

/** Current tips minus anything the student dismissed. */
export async function listTips(): Promise<SavingTip[]> {
  const transactions = readTransactionsSync();
  const budgets = await listBudgets();
  const profile = loadOnboardingData();
  const dismissed = readState().dismissed;
  const tips = buildTips(transactions, budgets, profile).filter(
    (tip) => !dismissed.includes(tip.id),
  );
  return delay(tips.map(({ id, title, body }) => ({ id, title, body })));
}

/** The single tip shown on the dashboard: highest-ranked, never dismissed. */
export async function getDashboardTip(): Promise<SavingTip | null> {
  const tips = await listTips();
  return tips[0] ?? null;
}

export async function listSavedTips(): Promise<SavingTip[]> {
  return delay(readState().saved);
}

export async function bookmarkTip(tip: SavingTip): Promise<SavingTip[]> {
  const state = readState();
  if (!state.saved.some((entry) => entry.id === tip.id)) {
    state.saved = [...state.saved, tip];
    writeState(state);
  }
  return delay(state.saved);
}

export async function removeSavedTip(id: string): Promise<SavingTip[]> {
  const state = readState();
  state.saved = state.saved.filter((entry) => entry.id !== id);
  writeState(state);
  return delay(state.saved);
}

/** Dismissed tips do not return to the list until the state is reset. */
export async function dismissTip(tip: SavingTip): Promise<SavingTip[]> {
  const state = readState();
  if (!state.dismissed.includes(tip.id)) {
    state.dismissed = [...state.dismissed, tip.id];
    writeState(state);
  }
  state.saved = state.saved.filter((entry) => entry.id !== tip.id);
  writeState(state);
  return delay(state.saved);
}
