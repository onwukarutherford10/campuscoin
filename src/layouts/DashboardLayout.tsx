import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearSession } from "../auth/session";
import { DATA_MODE } from "../services/api/config";
import { logout } from "../auth/liveAuth";
import Sidebar from "../components/Sidebar";

/**
 * Application shell for signed-in screens: collapsible desktop sidebar,
 * mobile drawer and the routed content column.
 */
export function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("cc.dashboardTheme");
    return saved === "dark" || (saved === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  });
  const location = useLocation();
  const navigate = useNavigate();

  function toggleTheme() {
    setDarkMode((previous) => {
      localStorage.setItem("cc.dashboardTheme", previous ? "light" : "dark");
      return !previous;
    });
  }

  const section = location.pathname.split("/")[1] || "dashboard";
  const labels: Record<string, string> = {
    dashboard: "Dashboard", transactions: "Transactions", budgets: "Budgets",
    reports: "Reports", profile: "Profile", categories: "Categories",
  };
  const currentLabel = labels[section] ?? "Dashboard";

  async function handleLogout() {
    if (DATA_MODE === "live") {
      try { await logout(); } catch { /* Identity is cleared locally by logout. */ }
    } else {
      clearSession();
    }
    navigate("/login", { replace: true });
  }

  return (
    <div className={`flex min-h-screen bg-canvas ${darkMode ? "dashboard-dark" : ""}`}>
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} onLogout={() => void handleLogout()} />

      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-gray-500">
            <ol className="flex items-center gap-2">
              {section === "dashboard" ? (
                <li aria-current="page" className="font-medium text-gray-700">Dashboard</li>
              ) : (
                <>
                  <li><Link to="/dashboard" className="transition hover:text-brand-dark">Dashboard</Link></li>
                  <li aria-hidden="true">/</li>
                  {section === "categories" ? (
                    <>
                      <li><Link to="/profile" className="transition hover:text-brand-dark">Profile</Link></li>
                      <li aria-hidden="true">/</li>
                    </>
                  ) : null}
                  <li aria-current="page" className="font-medium text-gray-700">{currentLabel}</li>
                </>
              )}
            </ol>
          </nav>
          <Outlet context={{ openMenu: () => setMenuOpen(true), darkMode, toggleTheme }} />
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
