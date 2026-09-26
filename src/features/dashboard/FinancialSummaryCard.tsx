import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { FinancialSummary } from "../../types";
import { formatNaira } from "../../utils/format";

interface FinancialSummaryCardProps {
  summary: FinancialSummary;
  onAddIncome: () => void;
  onAddExpense: () => void;
}

/** Dark financial summary panel: balance first, income and expense next. */
export function FinancialSummaryCard({ summary, onAddIncome, onAddExpense }: FinancialSummaryCardProps) {
  return (
    <section className="rounded-2xl bg-ink p-6 text-white" aria-label="Financial summary">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] text-ink-muted">Current balance</p>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{formatNaira(summary.balance)}</p>

          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            <div>
              <dt className="text-[13px] text-ink-muted">Income</dt>
              <dd className="mt-0.5 text-lg font-medium text-mint">{formatNaira(summary.income)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-muted">Expenses</dt>
              <dd className="mt-0.5 text-lg font-medium text-white">{formatNaira(summary.expenses)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-muted">Savings</dt>
              <dd className="mt-0.5 text-lg font-medium text-white">{formatNaira(summary.savings)}</dd>
            </div>
            {summary.savingsGoal !== null && summary.savingsGoal > 0 && (
              <div className="w-full sm:w-56">
                <dt className="text-[13px] text-ink-muted">
                  Savings goal · {formatNaira(summary.savingsGoal)}/mo
                </dt>
                <dd className="mt-1.5">
                  <span className="block h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <span
                      className="block h-full rounded-full bg-mint"
                      style={{
                        width: `${Math.min((summary.savings / summary.savingsGoal) * 100, 100)}%`,
                      }}
                    />
                  </span>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onAddIncome}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-dark"
          >
            <ArrowDownLeft size={17} />
            Add Income
          </button>
          <button
            type="button"
            onClick={onAddExpense}
            className="flex items-center gap-2 rounded-xl bg-mint px-5 py-3 text-sm font-medium text-ink transition hover:brightness-95"
          >
            <ArrowUpRight size={17} />
            Add Expense
          </button>
        </div>
      </div>
    </section>
  );
}

export default FinancialSummaryCard;
