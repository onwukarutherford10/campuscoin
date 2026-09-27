import type { ReactNode } from "react";
import { Menu } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  onOpenMenu: () => void;
}

/** Title row for routed screens: mobile menu, heading and trailing actions. */
export function PageHeader({ title, subtitle, actions, onOpenMenu }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-gray-600 transition hover:bg-white lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-gray-500">{subtitle}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export default PageHeader;
