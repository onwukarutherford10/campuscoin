import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { clearSession } from "../auth/session";
import Sidebar from "../components/Sidebar";

/**
 * Application shell for signed-in screens: collapsible desktop sidebar,
 * mobile drawer and the routed content column.
 */
export function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} onLogout={handleLogout} />

      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <Outlet context={{ openMenu: () => setMenuOpen(true) }} />
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
