import { ArrowRight, Sparkles } from "lucide-react";

interface InsightBannerProps {
  insight: string | null;
  onViewReports: () => void;
}

/** The one key insight on the dashboard — full analysis lives on Reports. */
export function InsightBanner({ insight, onViewReports }: InsightBannerProps) {
  if (!insight) return null;

  return (
    <button
      type="button"
      onClick={onViewReports}
      className="flex w-full items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,20,0.05)] transition hover:bg-gray-50"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <Sparkles size={15} />
        </span>
        <span className="min-w-0">
          <span className="block text-[12px] font-medium uppercase tracking-wide text-gray-400">
            Key insight
          </span>
          <span className="mt-0.5 block text-sm leading-relaxed text-gray-700">{insight}</span>
        </span>
      </span>
      <span className="mt-1 flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-dark">
        Reports
        <ArrowRight size={14} />
      </span>
    </button>
  );
}

export default InsightBanner;
