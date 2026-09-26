import type { TrendPoint } from "../../types";
import { EmptyState } from "../../components/StateViews";
import { formatNaira } from "../../utils/format";

interface ReportsCardProps {
  trend: TrendPoint[];
}

/**
 * Compact right-side reporting card: a simple income/expense trend line.
 * Deliberately not a full charting library for Phase 1.
 */
export function ReportsCard({ trend }: ReportsCardProps) {
  if (trend.length === 0) {
    return <EmptyState title="Not enough data yet" description="Reports appear once you have a few months of activity." />;
  }

  const width = 260;
  const height = 110;
  const padding = 6;
  const maxValue = Math.max(...trend.flatMap((point) => [point.income, point.expenses]));

  function toPoints(key: "income" | "expenses"): string {
    return trend
      .map((point, index) => {
        const x = padding + (index * (width - padding * 2)) / Math.max(trend.length - 1, 1);
        const y = height - padding - (point[key] / maxValue) * (height - padding * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div>
      <div className="flex items-center gap-4 text-[12px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-gray-800" aria-hidden="true" />
          Expenses
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Income and expenses over the last ${trend.length} months`}
      >
        <polyline points={toPoints("income")} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={toPoints("expenses")} fill="none" stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="mt-2 flex justify-between text-[11px] text-gray-400">
        {trend.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[13px]">
        <span className="text-gray-500">This month's expenses</span>
        <span className="font-medium text-gray-900">{formatNaira(trend[trend.length - 1].expenses)}</span>
      </div>
    </div>
  );
}

export default ReportsCard;
