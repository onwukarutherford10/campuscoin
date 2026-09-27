import type { TrendPoint } from "../../types";
import { Card } from "../../components/StateViews";
import ReportsCard from "../dashboard/ReportsCard";
import { formatNaira } from "../../utils/format";

interface TrendCardProps {
  trend: TrendPoint[];
}

/** Six-month income vs expenses with a plain-language reading of the line. */
export function TrendCard({ trend }: TrendCardProps) {
  const netPositive = trend.filter((point) => point.income > point.expenses).length;
  const latest = trend[trend.length - 1];

  let reading: string | null = null;
  if (trend.length >= 2) {
    reading =
      netPositive >= trend.length - 1
        ? `Income stayed above expenses in ${netPositive} of the last ${trend.length} months.`
        : `Expenses caught up with income in ${trend.length - netPositive} of the last ${trend.length} months.`;
    if (latest) {
      reading += ` This month: ${formatNaira(latest.income)} in, ${formatNaira(latest.expenses)} out.`;
    }
  }

  return (
    <Card title="Income vs expenses" action={<span className="text-[13px] text-gray-400">6 months</span>}>
      <ReportsCard trend={trend} />
      {reading && (
        <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{reading}</p>
      )}
    </Card>
  );
}

export default TrendCard;
