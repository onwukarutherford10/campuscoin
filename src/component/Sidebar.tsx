import { LayoutDashboard, LogOut, Settings, Users, X } from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const links = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Users", icon: Users },
  { label: "Reports", icon: LayoutDashboard },
  { label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose, onLogout }: SidebarProps) {
  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen w-[240px] border-r border-gray-200 bg-white transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex h-full flex-col p-5">
        <div className="mb-8 flex items-center justify-between">
          <div className="text-xl font-bold text-gray-900">WEB STARS</div>
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {links.map(({ label, icon: Icon }, index) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                index === 0
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={17} />
              {label}
            </a>
          ))}
        </nav>

        <button
          onClick={onLogout}
          className="mt-auto flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <LogOut size={17} />
          Log out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar