import { useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  ArrowLeftRight,
  Settings,
  User,
  Wallet,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { BrandMark } from "./BrandMark";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const links = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Transactions", icon: ArrowLeftRight, to: "/transactions" },
  { label: "Budgets", icon: Wallet, to: "/budgets" },
  { label: "Reports", icon: BarChart3, to: "/reports" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

interface NavItemsProps {
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavItems({ collapsed, onNavigate }: NavItemsProps) {
  return (
    <nav className="space-y-1" aria-label="Main navigation">
      {links.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={label}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              isActive
                ? "bg-brand-soft font-medium text-brand-dark"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            } ${collapsed ? "justify-center" : ""}`
          }
        >
          <Icon size={18} />
          {!collapsed && label}
        </NavLink>
      ))}
    </nav>
  );
}

interface SidebarFooterProps {
  collapsed: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
}

function SidebarFooter({ collapsed, onLogout, onNavigate }: SidebarFooterProps) {
  return (
    <div className="mt-auto space-y-1 border-t border-line pt-4">
      <NavLink
        to="/settings"
        onClick={onNavigate}
        title={collapsed ? "Profile" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <User size={18} />
        {!collapsed && "Profile"}
      </NavLink>
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? "Log out" : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <LogOut size={18} />
        {!collapsed && "Log out"}
      </button>
    </div>
  );
}

/**
 * Desktop sidebar with expand/collapse states, plus a mobile drawer.
 * Collapse animates width; the main column is a flex sibling so content
 * adapts automatically without tracked offsets.
 */
export function Sidebar({ isOpen, onClose, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-white p-4 transition-all duration-300 lg:flex ${
          collapsed ? "w-[76px]" : "w-[240px]"
        }`}
      >
        <div className={`mb-8 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <BrandMark compact={collapsed} />
          {!collapsed && (
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={() => setCollapsed(false)}
            className="mb-6 self-center rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronRight size={18} />
          </button>
        )}

        <NavItems collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} onLogout={onLogout} />
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-black/40"
            aria-hidden="true"
            onClick={onClose}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col bg-white p-4">
            <div className="mb-8 flex items-center justify-between">
              <BrandMark />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <NavItems collapsed={false} onNavigate={onClose} />
            <SidebarFooter collapsed={false} onLogout={onLogout} onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}

export default Sidebar;
