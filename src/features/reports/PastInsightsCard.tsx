import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { MonthlyInsight } from "../../types";
import { Card, EmptyState } from "../../components/StateViews";

interface PastInsightsCardProps {
  insights: MonthlyInsight[];
}

/** Older reviews, openable one at a time (Phase 3, section 12). */
export function PastInsightsCard({ insights }: PastInsightsCardProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card title="Past insights">
      {insights.length === 0 ? (
        <EmptyState
          title="No past insights yet"
          description="Each month's review is filed here after you've used Campus Coin for a while."
        />
      ) : (
        <ul className="divide-y divide-line">
          {insights.map((insight) => {
            const open = openId === insight.id;
            return (
              <li key={insight.id} className="py-3 first:pt-0 last:pb-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : insight.id)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {insight.month}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-gray-500">
                      {insight.summary}
                    </span>
                  </span>
                  {open ? (
                    <ChevronUp size={16} className="shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="shrink-0 text-gray-400" />
                  )}
                </button>

                {open && (
                  <dl className="mt-3 space-y-2 rounded-xl bg-gray-50 px-4 py-3 text-[13px] leading-relaxed">
                    <div>
                      <dt className="font-medium text-gray-500">Key change</dt>
                      <dd className="text-gray-700">{insight.change}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-500">Suggested action</dt>
                      <dd className="text-gray-700">{insight.suggestion}</dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default PastInsightsCard;
