import type { ReportSummary } from "../../types";
import { Card } from "../../components/StateViews";
import { formatNaira } from "../../utils/format";

interface MonthlySummaryCardProps {
  summary: ReportSummary;
}

/** Totals for the selected period: income, expenses, net and savings. */
export function MonthlySummaryCard({ summary }: MonthlySummaryCardProps) {
  const stats: { label: string; value: string; tone?: "income" | "danger" }[] = [
    { label: "Total income", value: formatNaira(summary.income), tone: "income" },
    { label: "Total expenses", value: formatNaira(summary.expenses) },
    {
      label: "Net balance",
      value: formatNaira(summary.net),
      tone: summary.net < 0 ? "danger" : undefined,
    },
    {
      label: "Savings",
      value: formatNaira(summary.savings),
      tone: summary.savings < 0 ? "danger" : summary.savings > 0 ? "income" : undefined,
    },
  ];

  return (
    <Card title="Monthly summary" action={<span className="text-[13px] text-gray-400">{summary.periodLabel}</span>}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-line bg-gray-50/60 p-4">
            <p className="text-[12px] font-medium uppercase tracking-wide text-gray-400">{stat.label}</p>
            <p
              className={`mt-1.5 text-lg font-semibold ${
                stat.tone === "income"
                  ? "text-brand-dark"
                  : stat.tone === "danger"
                    ? "text-red-600"
                    : "text-gray-900"
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {summary.income === 0 && summary.expenses === 0 && (
        <p className="mt-3 text-[13px] text-gray-500">
          Nothing recorded in this period yet. Try a wider date range.
        </p>
      )}
    </Card>
  );
}

export default MonthlySummaryCard;
