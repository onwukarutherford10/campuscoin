import { AlertTriangle, CheckCircle2, CircleAlert, Pencil, Trash2 } from "lucide-react";
import type { Budget } from "../../types";
import { formatNaira, formatPercent } from "../../utils/format";
import { CATEGORY_ICONS, FALLBACK_ICON } from "../../utils/categoryMeta";

interface BudgetRowProps {
  budget: Budget;
  onEdit: () => void;
  onDelete: () => void;
}

function statusOf(percentage: number) {
  if (percentage > 100) {
    return {
      label: "Exceeded",
      textClass: "text-red-600",
      chipClass: "bg-red-50 text-red-600",
      barClass: "bg-red-500",
      icon: CircleAlert,
    };
  }
  if (percentage >= 80) {
    return {
      label: "Near limit",
      textClass: "text-amber-600",
      chipClass: "bg-amber-50 text-amber-600",
      barClass: "bg-amber-500",
      icon: AlertTriangle,
    };
  }
  return {
    label: "On track",
    textClass: "text-brand-dark",
    chipClass: "bg-brand-soft text-brand-dark",
    barClass: "bg-brand",
    icon: CheckCircle2,
  };
}

/** One budget with progress, a labelled status (never colour alone) and actions. */
export function BudgetRow({ budget, onEdit, onDelete }: BudgetRowProps) {
  const percentage = budget.limit === 0 ? 0 : (budget.spent / budget.limit) * 100;
  const remaining = budget.limit - budget.spent;
  const status = statusOf(percentage);
  const StatusIcon = status.icon;
  const Icon = CATEGORY_ICONS[budget.category] ?? FALLBACK_ICON;

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon size={17} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{budget.category}</p>
          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium ${status.chipClass}`}>
            <StatusIcon size={12} />
            {status.label}
          </span>
        </div>

        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Edit ${budget.category} budget`}
            onClick={onEdit}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${budget.category} budget`}
            onClick={onDelete}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </span>
      </div>

      <p className="mt-3 text-sm text-gray-900">
        {formatNaira(budget.spent)} <span className="text-gray-400">/ {formatNaira(budget.limit)}</span>
        <span className="ml-2 text-gray-500">{formatPercent(percentage)}</span>
      </p>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${status.barClass}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <p className={`mt-1.5 text-[13px] ${status.textClass}`}>
        {remaining >= 0
          ? `${formatNaira(remaining)} remaining`
          : `${formatNaira(Math.abs(remaining))} over budget`}
      </p>
    </li>
  );
}

export default BudgetRow;
