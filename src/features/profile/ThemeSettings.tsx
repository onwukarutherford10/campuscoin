import { Moon, Sun } from "lucide-react";
import { Card } from "../../components/StateViews";

interface ThemeSettingsProps {
  darkMode: boolean;
  onToggle: () => void;
}

export function ThemeSettings({ darkMode, onToggle }: ThemeSettingsProps) {
  return (
    <Card title="Appearance" className="lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">Dark mode</p>
            <p className="mt-1 text-[13px] text-gray-500">Use a black-and-charcoal theme across your dashboard.</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700" htmlFor="dashboard-dark-mode">
          <input
            id="dashboard-dark-mode"
            type="checkbox"
            role="switch"
            checked={darkMode}
            onChange={onToggle}
            className="h-5 w-5 accent-brand"
          />
          {darkMode ? "On" : "Off"}
        </label>
      </div>
    </Card>
  );
}
