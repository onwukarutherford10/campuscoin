import { useState } from "react";
import { Bookmark, Lightbulb, Pin, X } from "lucide-react";
import type { SavingTip } from "../../types";
import { Card } from "../../components/StateViews";
import { DATA_MODE } from "../../services/api/config";
import { bookmarkTip, dismissTip } from "../../services/tipsService";
import { toast } from "../../services/toast";

interface SavingTipCardProps {
  tip: SavingTip | null;
}

/** Personalised saving tip area, ready for the insights engine in a later phase. */
export function SavingTipCard({ tip }: SavingTipCardProps) {
  const [pinned, setPinned] = useState(Boolean(tip?.bookmarked));
  const [dismissed, setDismissed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleSaved() {
    if (!tip) return;
    if (DATA_MODE === "mock") {
      setPinned((value) => !value);
      return;
    }
    setBusy(true);
    try {
      await bookmarkTip(tip);
      setPinned((value) => !value);
      toast.success(pinned ? "Tip removed from saved tips." : "Tip saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't update that tip.");
    } finally {
      setBusy(false);
    }
  }

  async function dismissCurrent() {
    if (!tip) return;
    if (DATA_MODE === "mock") {
      setDismissed(true);
      return;
    }
    setBusy(true);
    try {
      await dismissTip(tip);
      setDismissed(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't dismiss that tip.");
    } finally {
      setBusy(false);
    }
  }

  if (!tip || dismissed) return null;

  return (
    <Card title="Saving tip" className="border border-brand/30 bg-brand-soft/60">
      <header className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-brand-dark">
          <Lightbulb size={16} />
          {tip.title}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={pinned ? "Remove saved tip" : "Save tip"}
            aria-pressed={pinned}
            disabled={busy}
            onClick={() => void toggleSaved()}
            className={`rounded-lg p-1.5 transition hover:bg-white/70 ${pinned ? "text-brand-dark" : "text-gray-500"}`}
          >
            {DATA_MODE === "live" ? <Bookmark size={15} /> : <Pin size={15} />}
          </button>
          <button
            type="button"
            aria-label="Dismiss tip"
            disabled={busy}
            onClick={() => void dismissCurrent()}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/70"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <p className="mt-3 text-sm leading-relaxed text-gray-700">{tip.body}</p>

      {DATA_MODE === "mock" && showDetail && (
        <p className="mt-3 rounded-xl bg-white/70 px-4 py-3 text-[13px] leading-relaxed text-gray-600">
          Based on this month's spending against your recent pattern. Open Reports for the full
          money review and more tips.
        </p>
      )}

      {DATA_MODE === "mock" && <button
        type="button"
        onClick={() => setShowDetail((value) => !value)}
        className="mt-4 rounded-xl border border-brand/40 bg-white px-4 py-2 text-[13px] font-medium text-brand-dark transition hover:bg-white/80"
      >
        {showDetail ? "Hide insight" : "View insight"}
      </button>}
    </Card>
  );
}

export default SavingTipCard;
