import { Bookmark, BookmarkCheck, Lightbulb, X } from "lucide-react";
import type { SavingTip } from "../../types";
import { Card, EmptyState } from "../../components/StateViews";

interface TipsSectionProps {
  tips: SavingTip[];
  savedTips: SavingTip[];
  busy: boolean;
  onBookmark: (tip: SavingTip) => void;
  onDismiss: (tip: SavingTip) => void;
  onRemoveSaved: (id: string) => void;
}

/** Ranked tips with bookmark/dismiss, plus everything bookmarked (§13–15). */
export function TipsSection({ tips, savedTips, busy, onBookmark, onDismiss, onRemoveSaved }: TipsSectionProps) {
  return (
    <>
      <Card title="Saving tips">
        {tips.length === 0 ? (
          <EmptyState
            title="No tips right now"
            description="Tips appear when your spending patterns give us something useful to say."
          />
        ) : (
          <ul className="space-y-3">
            {tips.map((tip) => (
              <li key={tip.id} className="rounded-xl border border-line bg-gray-50/60 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-brand-dark">
                    <Lightbulb size={14} className="shrink-0" />
                    <span className="truncate">{tip.title}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Save tip: ${tip.title}`}
                      disabled={busy}
                      onClick={() => onBookmark(tip)}
                      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white hover:text-brand-dark disabled:opacity-50"
                    >
                      <Bookmark size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Dismiss tip: ${tip.title}`}
                      disabled={busy}
                      onClick={() => onDismiss(tip)}
                      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{tip.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Saved tips">
        {savedTips.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            description="Bookmark a tip above to keep it here for later."
          />
        ) : (
          <ul className="space-y-3">
            {savedTips.map((tip) => (
              <li key={tip.id} className="rounded-xl bg-brand-soft/50 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-brand-dark">
                    <BookmarkCheck size={14} className="shrink-0" />
                    <span className="truncate">{tip.title}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove saved tip: ${tip.title}`}
                    disabled={busy}
                    onClick={() => onRemoveSaved(tip.id)}
                    className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
                  >
                    <X size={15} />
                  </button>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-700">{tip.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

export default TipsSection;
