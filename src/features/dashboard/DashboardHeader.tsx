import { Bell, Menu } from "lucide-react";
import { getSession } from "../../auth/session";
import { getProfileSync } from "../../services/profileService";
import { loadOnboardingData } from "../../utils/storage";
import { currentPeriodLabel, firstNameOf, timeBasedGreeting } from "../../utils/format";
import { DATA_MODE } from "../../services/api/config";
import { useLiveAuth } from "../../auth/useLiveAuth";
import type { DashboardAlert } from "../../types";
import NotificationsPanel from "./NotificationsPanel";

interface DashboardHeaderProps {
  onOpenMenu: () => void;
  alerts?: DashboardAlert[];
  onRead: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

/** Greeting, current period and profile access. Mobile keeps a compact top bar. */
export function DashboardHeader({ onOpenMenu, alerts = [], onRead, onDismiss }: DashboardHeaderProps) {
  const unreadCount = alerts.filter((alert) => !alert.readAt).length;
  const auth = useLiveAuth();
  const profile = DATA_MODE === "mock" ? loadOnboardingData() : null;
  const session = getSession();
  const avatar = DATA_MODE === "live" ? null : getProfileSync().avatar;
  const displayName = DATA_MODE === "live" ? auth.user?.name ?? "" : profile?.fullName || session?.name || "";
  const name = firstNameOf(displayName);
  const initials = (displayName || "Campus Coin")
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const monogram = avatar ? (
    <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
  ) : (
    initials
  );

  return (
    <header className="mb-6">
      {/* Mobile top bar */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-900">Campus Coin</span>
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[12px] font-semibold text-brand-dark">
          {monogram}
        </span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            {timeBasedGreeting()}, {name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Here's how your money is looking this month.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-xl border border-line bg-white px-4 py-2 text-[13px] text-gray-600 sm:inline-block">
            {currentPeriodLabel()}
          </span>
          <details className="relative z-30">
            <summary aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
              className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-line bg-white text-gray-600 transition hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <Bell size={17} />
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </summary>
            <div className="absolute right-0 top-12 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-white p-4 shadow-xl">
              <NotificationsPanel alerts={alerts} onRead={onRead} onDismiss={onDismiss} />
            </div>
          </details>
          <span className="hidden h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-brand-soft text-[13px] font-semibold text-brand-dark lg:flex">
            {monogram}
          </span>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
