import { useState } from "react";
import { Bell, Menu, Search, X } from "lucide-react";
import Sidebar from "./Sidebar";

const cards = [1, 2, 3, 4];

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userName = localStorage.getItem("userName") || "John";

  function handleLogout() {
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-[var(--primaryColor)] text-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />

      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
        />
      )}

      <main className="min-h-screen lg:ml-[240px]">
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="relative hidden sm:block">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              aria-label="Search"
              placeholder="Search"
              className="h-9 w-56 border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-[var(--secondaryColor)]"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button aria-label="Notifications" className="relative p-2 text-gray-500 hover:bg-gray-100">
              <Bell size={19} />
            </button>
            <span className="border-l border-gray-200 pl-3 text-sm font-medium">{userName}</span>
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Good to see you, {userName}</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome to your Dashboard.</p>
          </div>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card} className="flex h-32 items-center justify-center border border-gray-200 bg-white text-sm font-medium text-gray-400">
                Under construction
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {[1, 2].map((panel) => (
              <div key={panel} className="flex h-80 items-center justify-center border border-gray-200 bg-white text-sm font-medium text-gray-400">
                Under construction
              </div>
            ))}
          </section>

          <div className="flex h-64 items-center justify-center border border-gray-200 bg-white text-sm font-medium text-gray-400">
            Under construction
          </div>
        </div>
      </main>
    </div>
  );
}
