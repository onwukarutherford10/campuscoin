import { useState } from "react";
import { BellRing, Check, X } from "lucide-react";
import type { DashboardAlert } from "../../types";

interface NotificationsPanelProps {
  alerts: DashboardAlert[];
  onRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

export function NotificationsPanel({ alerts, onRead, onDismiss }: NotificationsPanelProps) {
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    try {
      await action();
    } finally {
      setPending(null);
    }
  }

  return (
    <section id="dashboard-alerts" className="rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="alerts-title">
      <div className="flex items-center gap-2 text-amber-800">
        <BellRing size={18} />
        <h2 id="alerts-title" className="text-[15px] font-semibold">Budget alerts</h2>
      </div>
      <ul className="mt-3 divide-y divide-amber-200/70">
        {alerts.map((alert) => (
          <li key={alert.id} className={`flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center ${alert.readAt ? "opacity-70" : ""}`}>
            <p className="min-w-0 flex-1 text-sm text-amber-950">{alert.message}</p>
            <div className="flex shrink-0 gap-2">
              {!alert.readAt && (
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void run(`read:${alert.id}`, () => onRead(alert.id))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-medium text-amber-900 disabled:opacity-50"
                >
                  <Check size={13} /> {pending === `read:${alert.id}` ? "Saving…" : "Mark read"}
                </button>
              )}
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void run(`dismiss:${alert.id}`, () => onDismiss(alert.id))}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
              >
                <X size={13} /> {pending === `dismiss:${alert.id}` ? "Dismissing…" : "Dismiss"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default NotificationsPanel;
