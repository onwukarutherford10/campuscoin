import { Sparkles } from "lucide-react";
import type { MonthlyInsight } from "../../types";
import { Card, EmptyState } from "../../components/StateViews";

interface InsightCardProps {
  insight: MonthlyInsight | null;
}

/** The current month's AI review, in three short advisory sections. */
export function InsightCard({ insight }: InsightCardProps) {
  if (!insight) {
    return (
      <Card title="Monthly insight">
        <EmptyState
          title="Not enough to review yet"
          description="Your money review appears once you've logged a few transactions."
        />
      </Card>
    );
  }

  return (
    <Card
      title="Monthly insight"
      action={
        <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-medium text-brand-dark">
          <Sparkles size={12} />
          Advisory
        </span>
      }
    >
      <p className="text-[15px] font-semibold text-gray-900">
        Your {insight.month} money review
      </p>

      <dl className="mt-3 space-y-3">
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <dt className="text-[12px] font-medium uppercase tracking-wide text-gray-400">Review</dt>
          <dd className="mt-1 text-sm leading-relaxed text-gray-700">{insight.summary}</dd>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3">
          <dt className="text-[12px] font-medium uppercase tracking-wide text-gray-400">
            What changed
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-gray-700">{insight.change}</dd>
        </div>
        <div className="rounded-xl bg-brand-soft/60 px-4 py-3">
          <dt className="text-[12px] font-medium uppercase tracking-wide text-brand-dark/70">
            What you could try
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-brand-dark">{insight.suggestion}</dd>
        </div>
      </dl>

      <p className="mt-3 text-[12px] text-gray-400">
        Guidance based on your own numbers, not professional financial advice.
      </p>
    </Card>
  );
}

export default InsightCard;
