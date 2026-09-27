import type { Budget } from "../../types";
import { EmptyState } from "../../components/StateViews";
import { formatNaira, formatPercent } from "../../utils/format";

interface BudgetOverviewProps {
  budgets: Budget[];
  onSetBudget: () => void;
}

function statusOf(percentage: number): { label: string; className: string } {
  if (percentage > 100) return { label: "Exceeded", className: "text-red-600" };
  if (percentage >= 80) return { label: "Near limit", className: "text-amber-600" };
  return { label: "On track", className: "text-brand-dark" };
}

/** Dashboard-level budget summary with near-limit and exceeded states. */
export function BudgetOverview({ budgets, onSetBudget }: BudgetOverviewProps) {
  if (budgets.length === 0) {
    return (
      <EmptyState
        title="No category budgets yet."
        description="Set a limit for a category and we'll track your progress here."
        actionLabel="Set a budget"
        onAction={onSetBudget}
      />
    );
  }

  return (
    <ul className="space-y-5">
      {budgets.map((budget) => {
        const percentage = budget.limit === 0 ? 0 : (budget.spent / budget.limit) * 100;
        const remaining = budget.limit - budget.spent;
        const status = statusOf(percentage);
        const barColor = percentage > 100 ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-brand";

        return (
          <li key={budget.id}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-gray-700">{budget.category}</span>
              <span className={`font-medium ${status.className}`}>{status.label}</span>
            </div>

            <p className="mt-1 text-sm text-gray-900">
              {formatNaira(budget.spent)}{" "}
              <span className="text-gray-400">/ {formatNaira(budget.limit)}</span>
              <span className="ml-2 text-gray-500">{formatPercent(percentage)}</span>
            </p>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            <p className="mt-1.5 text-[13px] text-gray-500">
              {remaining >= 0 ? `${formatNaira(remaining)} remaining` : `${formatNaira(Math.abs(remaining))} over budget`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export default BudgetOverview;
