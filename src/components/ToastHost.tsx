import { useEffect, useState } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { subscribeToToasts, type ToastItem, type ToastTone } from "../services/toast";

const TONE_STYLES: Record<ToastTone, { icon: typeof CheckCircle2; iconClass: string }> = {
  success: { icon: CheckCircle2, iconClass: "text-mint" },
  error: { icon: XCircle, iconClass: "text-red-400" },
};

/** Fixed, screen-reader-friendly toast stack; mounted once at the app root. */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToToasts((item) => {
      setItems((prev) => [...prev.slice(-2), item]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      }, 3400);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => {
        const { icon: Icon, iconClass } = TONE_STYLES[item.tone];
        return (
          <div
            key={item.id}
            className="pop-in pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg"
          >
            <Icon size={17} className={`shrink-0 ${iconClass}`} />
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
              className="shrink-0 rounded p-1 text-white/50 transition hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastHost;
