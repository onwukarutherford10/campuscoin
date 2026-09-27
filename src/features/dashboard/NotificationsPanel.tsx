import { useState } from "react";
import { BellRing, Check, Inbox, Megaphone, X } from "lucide-react";
import type { DashboardAlert } from "../../types";

interface NotificationsPanelProps {
  alerts: DashboardAlert[];
  onRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

type View = "inbox" | "read";

function alertLabel(kind: string) {
  if (kind === "announcement") return "Announcement";
  if (kind === "exceeded") return "Budget exceeded";
  if (kind === "near_limit") return "Budget alert";
  return "Update";
}

function alertDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function NotificationsPanel({ alerts, onRead, onDismiss }: NotificationsPanelProps) {
  const [view, setView] = useState<View>("inbox");
  const [pending, setPending] = useState<string | null>(null);
  const inbox = alerts.filter((alert) => !alert.readAt);
  const read = alerts.filter((alert) => Boolean(alert.readAt));
  const visible = view === "inbox" ? inbox : read;

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    try {
      await action();
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="alerts-title" className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
      <div className="border-b border-line px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
            <BellRing size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="alerts-title" className="text-base font-semibold text-gray-900">Notifications</h2>
            <p className="mt-0.5 text-xs text-gray-500">Updates that matter to your money.</p>
          </div>
        </div>
        <div role="tablist" aria-label="Notification views" className="mt-5 flex gap-1 rounded-xl bg-gray-50 p-1">
          {(["inbox", "read"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`notifications-${tab}-tab`}
              aria-selected={view === tab}
              aria-controls="notifications-list"
              onClick={() => setView(tab)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${view === tab ? "border border-line bg-white text-gray-900 shadow-sm" : "border border-transparent text-gray-500 hover:text-gray-900"}`}
            >
              {tab === "inbox" ? "Inbox" : "Read"}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${view === tab ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-600"}`}>
                {tab === "inbox" ? inbox.length : read.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div id="notifications-list" role="tabpanel" aria-labelledby={`notifications-${view}-tab`} className="max-h-[min(26rem,55vh)] overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-gray-500"><Inbox size={21} aria-hidden="true" /></span>
            <p className="mt-3 text-sm font-semibold text-gray-900">{view === "inbox" ? "Your inbox is clear" : "Nothing marked as read"}</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-gray-500">{view === "inbox" ? "New announcements and budget alerts will appear here." : "Items you mark as read will stay here until dismissed."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((alert) => (
              <li key={alert.id} className="px-5 py-4 transition-colors hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alert.kind === "announcement" ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-700"}`}>
                    {alert.kind === "announcement" ? <Megaphone size={16} aria-hidden="true" /> : <BellRing size={16} aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">{alertLabel(alert.kind)}</span>
                      <span className="shrink-0 text-[11px] text-gray-500">{alertDate(alert.createdAt)}</span>
                    </div>
                    <p className="mt-1 break-words text-[13px] leading-5 text-gray-800">{alert.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!alert.readAt && (
                        <button
                          type="button"
                          disabled={pending !== null}
                          onClick={() => void run(`read:${alert.id}`, () => onRead(alert.id))}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-dark transition hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Check size={13} aria-hidden="true" /> {pending === `read:${alert.id}` ? "Saving…" : "Mark as read"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => void run(`dismiss:${alert.id}`, () => onDismiss(alert.id))}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                      >
                        <X size={13} aria-hidden="true" /> {pending === `dismiss:${alert.id}` ? "Dismissing…" : "Dismiss"}
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default NotificationsPanel;
