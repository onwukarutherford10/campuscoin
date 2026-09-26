import type { CurrentMonthReport } from "../../types";
import { Card, EmptyState } from "../../components/StateViews";
import { formatNaira } from "../../utils/format";

interface CurrentMonthCardProps {
  report: CurrentMonthReport;
  monthLabel: string;
}

/** Daily + weekly spending for the current month with honest context. */
export function CurrentMonthCard({ report, monthLabel }: CurrentMonthCardProps) {
  if (report.days.length === 0) {
    return (
      <Card title={`Current month · ${monthLabel}`}>
        <EmptyState
          title="No spending yet this month"
          description="Daily and weekly summaries appear after your first expense."
        />
      </Card>
    );
  }

  const maxDay = Math.max(...report.days.map((day) => day.amount));
  const maxWeek = Math.max(...report.weeks.map((week) => week.amount), 1);
  const total = report.days.reduce((sum, day) => sum + day.amount, 0);

  return (
    <Card title={`Current month · ${monthLabel}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-gray-50/60 p-3">
          <p className="text-[12px] text-gray-400">Spent this month</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{formatNaira(total)}</p>
        </div>
        <div className="rounded-xl border border-line bg-gray-50/60 p-3">
          <p className="text-[12px] text-gray-400">Average daily</p>
          <p className="mt-1 text-base font-semibold text-gray-900">
            {formatNaira(report.averageDaily)}
          </p>
        </div>
      </div>

      {/* Daily spending — one thin bar per day with activity. */}
      <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-gray-400">
        Daily spending
      </p>
      <div className="mt-2 flex h-24 items-end gap-1" role="img" aria-label="Daily spending chart">
        {report.days.map((day) => (
          <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-brand/80"
              style={{ height: `${Math.max((day.amount / maxDay) * 68, 4)}px` }}
              title={`${day.date}: ${formatNaira(day.amount)}`}
            />
            <span className="text-[9px] text-gray-400">{Number(day.date.slice(8, 10))}</span>
          </div>
        ))}
      </div>

      {/* Weekly totals */}
      <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-gray-400">
        Weekly spending
      </p>
      <ul className="mt-2 space-y-2">
        {report.weeks.map((week) => (
          <li key={week.label} className="flex items-center gap-3 text-[13px]">
            <span className="w-16 shrink-0 text-gray-500">{week.label}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <span
                className="block h-full rounded-full bg-ink"
                style={{ width: `${Math.max((week.amount / maxWeek) * 100, 3)}%` }}
              />
            </span>
            <span className="w-20 shrink-0 text-right text-gray-700">
              {formatNaira(week.amount)}
            </span>
          </li>
        ))}
      </ul>

      {report.highestDay && (
        <p className="mt-3 text-[13px] text-gray-500">
          Highest spending day:{" "}
          <span className="font-medium text-gray-700">
            {new Date(report.highestDay.date).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
            })}{" "}
            ({formatNaira(report.highestDay.amount)})
          </span>
        </p>
      )}

      {report.context && (
        <p className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-600">
          {report.context}
        </p>
      )}
    </Card>
  );
}

export default CurrentMonthCard;
