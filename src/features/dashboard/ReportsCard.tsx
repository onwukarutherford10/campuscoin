import { ResponsiveBar } from "@nivo/bar";
import type { TrendPoint } from "../../types";
import { EmptyState } from "../../components/StateViews";
import { formatNaira } from "../../utils/format";

interface ReportsCardProps {
  trend: TrendPoint[];
}

/** Six real monthly report totals, presented as grouped income and expense bars. */
export function ReportsCard({ trend }: ReportsCardProps) {
  if (trend.length === 0) {
    return <EmptyState title="Not enough data yet" description="Monthly totals will appear as activity is recorded." />;
  }

  const hasActivity = trend.some((point) => point.income > 0 || point.expenses > 0);
  if (!hasActivity) {
    return <EmptyState title="No report activity yet" description="Income and expense history will appear here after your first transaction." />;
  }

  return (
    <div>
      <div className="h-72" aria-label={`Income and expenses over the last ${trend.length} months`}>
        <ResponsiveBar
          data={trend.map((point) => ({ month: point.label, Income: point.income, Expenses: point.expenses }))}
          keys={["Income", "Expenses"]}
          indexBy="month"
          groupMode="grouped"
          margin={{ top: 12, right: 12, bottom: 42, left: 62 }}
          padding={0.28}
          innerPadding={3}
          colors={["#20976c", "#1f2937"]}
          borderRadius={3}
          enableLabel={false}
          valueFormat={(value) => formatNaira(value)}
          axisLeft={{ format: (value) => Number(value) >= 1000 ? `₦${Math.round(Number(value) / 1000)}k` : `₦${value}` }}
          axisBottom={{ tickSize: 0, tickPadding: 10 }}
          role="img"
          ariaLabel="Six month income and expense bar chart"
          legends={[{
            dataFrom: "keys",
            anchor: "top-left",
            direction: "row",
            translateY: -10,
            itemWidth: 82,
            itemHeight: 18,
            symbolSize: 9,
            symbolShape: "circle",
          }]}
        />
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-line pt-3 text-[13px]">
        <span className="text-gray-500">This month's expenses</span>
        <span className="font-medium text-gray-900">{formatNaira(trend[trend.length - 1].expenses)}</span>
      </div>
    </div>
  );
}

export default ReportsCard;
