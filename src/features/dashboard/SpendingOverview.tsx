import type { SpendingOverview as SpendingData } from "../../types";
import { EmptyState } from "../../components/StateViews";
import { formatNaira, formatPercent } from "../../utils/format";
import { ResponsivePie } from "@nivo/pie";

interface SpendingOverviewProps {
  data: SpendingData;
  onAddTransaction: () => void;
}

/** Category spending breakdown backed by the dashboard's current-month totals. */
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

      <div className="mt-3 h-72" role="img" aria-label="Current month spending by category pie chart">
        <ResponsivePie
          data={data.categories.map((category) => ({
            id: category.category,
            label: category.category,
            value: category.amount,
          }))}
          margin={{ top: 18, right: 18, bottom: 18, left: 18 }}
          innerRadius={0.58}
          padAngle={1.5}
          cornerRadius={4}
          activeOuterRadiusOffset={6}
          colors={{ scheme: "greens" }}
          enableArcLinkLabels={false}
          arcLabelsSkipAngle={12}
          valueFormat={(value) => formatNaira(value)}
          tooltip={({ datum }) => (
            <div className="flex items-center gap-2 rounded-xl border border-[#34363a] bg-[#1b1c1f] px-3 py-2 text-sm text-[#f4f4f5] shadow-xl">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: datum.color }} />
              <span>{datum.label}: <strong>{formatNaira(datum.value)}</strong></span>
            </div>
          )}
          legends={[]}
        />
      </div>

      <ul className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
        {data.categories.map((category) => (
          <li key={category.category} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="truncate font-medium text-gray-700">{category.category}</span>
              <span className="shrink-0 text-gray-500">
                {formatNaira(category.amount)} · {formatPercent(category.percentage)}
              </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SpendingOverview;
