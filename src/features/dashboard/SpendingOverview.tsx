import type { SpendingOverview as SpendingData } from "../../types";
import { EmptyState } from "../../components/StateViews";
import { formatNaira, formatPercent } from "../../utils/format";

interface SpendingOverviewProps {
  data: SpendingData;
  onAddTransaction: () => void;
}

/** Category spending breakdown with horizontal bars. */
export function SpendingOverview({ data, onAddTransaction }: SpendingOverviewProps) {
  if (data.categories.length === 0) {
    return (
      <EmptyState
        title="No spending recorded yet"
        description="Add your first expense to start seeing where your money goes."
        actionLabel="Add transaction"
        onAction={onAddTransaction}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-2xl font-semibold text-gray-900">{formatNaira(data.totalExpenses)}</p>
        <p className="text-[13px] text-gray-500">
          Top category: <span className="font-medium text-brand-dark">{data.topCategory}</span>
        </p>
      </div>

      <ul className="mt-5 space-y-4">
        {data.categories.map((category) => (
          <li key={category.category}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-gray-700">{category.category}</span>
              <span className="text-gray-500">
                {formatNaira(category.amount)} · {formatPercent(category.percentage)}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100"
              role="img"
              aria-label={`${category.category}: ${formatNaira(category.amount)}, ${formatPercent(category.percentage)} of spending`}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${category.percentage}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SpendingOverview;
