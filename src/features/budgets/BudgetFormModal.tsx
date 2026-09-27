import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { Budget, ServiceResult } from "../../types";
import { useCategories } from "../../hooks/useCategories";
import { CategoryInput } from "../../components/CategoryInput";

interface BudgetFormModalProps {
  mode: "add" | "edit";
  budget?: Budget;
  /** Existing budgets; used to keep categories unique in add mode. */
  budgets: Budget[];
  onClose: () => void;
  onSubmit: (input: { id?: string; category: string; limit: number }) => Promise<ServiceResult<Budget>>;
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand";

/** Create or edit one monthly category budget. */
export function BudgetFormModal({ mode, budget, budgets, onClose, onSubmit }: BudgetFormModalProps) {
  const { items: categories } = useCategories();
  const [category, setCategory] = useState(budget?.category ?? "");
  const [amount, setAmount] = useState(budget ? String(budget.limit) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const available = categories.filter((entry) => {
    if (entry.type !== "expense") return false;
    if (mode === "edit" && budget && entry.name === budget.category) return true;
    return !budgets.some((existing) => existing.category === entry.name);
  });

  const selected = category || available[0]?.name || "";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const result = await onSubmit({
      id: budget?.id,
      category: selected,
      limit: Number(amount),
    });
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.error) setErrors({ form: result.error });
      return;
    }
    onClose();
  }

  const nothingLeft = mode === "add" && available.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-form-title"
        className="w-full max-w-md rounded-2xl bg-white p-6"
      >
        <header className="flex items-center justify-between">
          <h2 id="budget-form-title" className="text-base font-semibold text-gray-900">
            {mode === "edit" ? "Edit budget" : "Set a budget"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </header>

        {nothingLeft ? (
          <p className="mt-4 text-sm text-gray-600">
            Every expense category already has a budget. Edit one of them to make a change.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5">
            <label htmlFor="budget-category" className="block text-[13px] font-medium text-gray-700">
              Category
            </label>
            <CategoryInput
              id="budget-category"
              value={selected}
              onChange={setCategory}
              options={available.map((option) => option.name)}
              placeholder="Select a category"
              inputClassName={inputClass}
            />
            {errors.category && <p className="mt-1 text-[13px] text-red-600">{errors.category}</p>}

            <label htmlFor="budget-limit" className="mt-4 block text-[13px] font-medium text-gray-700">
              Monthly limit
            </label>
            <input
              id="budget-limit"
              type="number"
              min={0}
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 20000"
              className={inputClass}
            />
            {errors.limit && <p className="mt-1 text-[13px] text-red-600">{errors.limit}</p>}
            {errors.form && <p className="mt-3 text-[13px] text-red-600">{errors.form}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? "Saving…" : mode === "edit" ? "Save changes" : "Create budget"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default BudgetFormModal;
