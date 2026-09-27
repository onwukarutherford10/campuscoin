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
        <button type="button" role="switch" aria-checked={darkMode} aria-label="Dark mode"
          onClick={onToggle}
          className={`relative h-8 w-14 rounded-full border transition-colors focus-visible:outline-offset-4 ${darkMode ? "border-brand bg-brand" : "border-line bg-gray-200"}`}>
          <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${darkMode ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>
    </Card>
  );
}
