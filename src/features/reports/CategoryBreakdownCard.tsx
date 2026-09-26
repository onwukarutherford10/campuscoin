import type { CategorySpending } from "../../types";
import { Card, EmptyState } from "../../components/StateViews";
import { formatNaira, formatPercent } from "../../utils/format";
import { CATEGORY_ICONS, FALLBACK_ICON } from "../../utils/categoryMeta";

interface CategoryBreakdownCardProps {
  categories: CategorySpending[];
  /** One plain-language sentence describing where the money went. */
  interpretation: string | null;
}

/** Bar chart plus supporting list — the chart never appears without words. */
export function CategoryBreakdownCard({ categories, interpretation }: CategoryBreakdownCardProps) {
  if (categories.length === 0) {
    return (
      <Card title="Spending by category">
        <EmptyState
          title="No spending in this period"
          description="Category analysis appears once there are expenses to break down."
        />
      </Card>
    );
  }

  const max = categories[0]?.amount || 1;

  return (
    <Card title="Spending by category">
      <div className="space-y-3">
        {categories.map((entry) => {
          const Icon = CATEGORY_ICONS[entry.category] ?? FALLBACK_ICON;
          return (
            <div key={entry.category}>
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <span className="flex min-w-0 items-center gap-2 text-gray-700">
                  <Icon size={15} className="shrink-0 text-gray-400" />
                  <span className="truncate">{entry.category}</span>
                </span>
                <span className="shrink-0 text-gray-500">
                  {formatNaira(entry.amount)} · {formatPercent(entry.percentage)}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max((entry.amount / max) * 100, 3)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {interpretation && (
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-[13px] leading-relaxed text-gray-600">
          {interpretation}
        </p>
      )}
    </Card>
  );
}

export default CategoryBreakdownCard;
