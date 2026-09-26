import { useEffect, useRef, useState, type FormEvent } from "react";
import { Repeat, Sparkles, X } from "lucide-react";
import type {
  RecurrenceFrequency,
  ServiceResult,
  Transaction,
  TransactionDraft,
  TransactionType,
} from "../../types";
import { useCategories } from "../../hooks/useCategories";
import { CategoryInput } from "../../components/CategoryInput";
import { recordCorrection, suggestCategory } from "../../services/categorySuggest";
import { todayISO } from "../../services/store";

interface TransactionFormModalProps {
  mode: "add" | "edit";
  /** Starting type for a new transaction. */
  initialType?: TransactionType;
  /** Existing record when editing. */
  initial?: Transaction;
  onClose: () => void;
  onSubmit: (draft: TransactionDraft) => Promise<ServiceResult<Transaction>>;
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand";
const labelClass = "block text-[13px] font-medium text-gray-700";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[13px] text-red-600">{message}</p>;
}

/**
 * Add/edit dialog shared by the dashboard and the transactions page.
 * Description and amount come first; notes and recurrence stay secondary.
 * Category suggestions are advisory only; the field is always editable.
 */
export function TransactionFormModal({
  mode,
  initialType = "expense",
  initial,
  onClose,
  onSubmit,
}: TransactionFormModalProps) {
  const { items: categories } = useCategories();
  const [type, setType] = useState<TransactionType>(initial?.type ?? initialType);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [recurring, setRecurring] = useState(initial?.recurring === true);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initial?.frequency ?? "monthly");
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  /** Once the student picks a category by hand, typing never overrides it. */
  const [categoryTouched, setCategoryTouched] = useState(initial != null);
  const [autoFilled, setAutoFilled] = useState(false);
  const suggestionToken = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const options = categories
    .filter((entry) => entry.type === type)
    .map((entry) => entry.name);
  // Keep an edited record's category selectable even if it was since removed.
  const selectOptions = initial && initial.type === type && !options.includes(initial.category)
    ? [initial.category, ...options]
    : options;
  // Starts empty so a typing-time suggestion is visible and meaningful;
  // the student always makes (or confirms) the final pick.
  const selected = category;
  const selectedRef = useRef(selected);
  const touchedRef = useRef(categoryTouched);

  useEffect(() => {
    selectedRef.current = selected;
    touchedRef.current = categoryTouched;
  }, [selected, categoryTouched]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function switchType(next: TransactionType) {
    setType(next);
    setCategory("");
    setSuggestion(null);
    setCategoryTouched(false);
    setAutoFilled(false);
    setErrors({});
  }

  /**
   * Category suggestion runs while the student types (not on blur):
   * high-confidence repeats of a corrected description auto-select,
   * everything else appears as an advisory suggestion chip.
   */
  function handleDescriptionChange(value: string) {
    setDescription(value);
    setSuggestion(null);
    setAutoFilled(false);
    const token = ++suggestionToken.current;
    suggestCategory(value, type).then((result) => {
      if (token !== suggestionToken.current) return;
      if (!result) return;
      if (result.confidence === "high" && !touchedRef.current) {
        setCategory(result.category);
        setAutoFilled(true);
        return;
      }
      if (result.category !== selectedRef.current) setSuggestion(result.category);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected) {
      setErrors({ category: "Choose a category for this transaction." });
      return;
    }
    setSubmitting(true);
    const result = await onSubmit({
      type,
      description,
      amount: Number(amount),
      category: selected,
      date,
      notes: notes.trim() || undefined,
      recurring,
      frequency,
      endDate: recurring ? endDate || undefined : undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.error) setErrors({ form: result.error });
      return;
    }
    // The saved choice is ground truth; remember it for future suggestions.
    recordCorrection(description, type, selected);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="txn-form-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
      >
        <header className="flex items-center justify-between">
          <h2 id="txn-form-title" className="text-base font-semibold text-gray-900">
            {mode === "edit"
              ? "Edit transaction"
              : type === "expense"
                ? "Add expense"
                : "Add income"}
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

        <form onSubmit={handleSubmit} className="mt-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
            {(["expense", "income"] as TransactionType[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={type === option}
                onClick={() => switchType(option)}
                className={`rounded-lg py-2 text-sm font-medium capitalize transition ${
                  type === option ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <label htmlFor="txn-description" className={`mt-4 ${labelClass}`}>
            Description
          </label>
          <input
            id="txn-description"
            type="text"
            autoFocus
            value={description}
            onChange={(event) => handleDescriptionChange(event.target.value)}
            placeholder={type === "expense" ? "e.g. Campus Cafe" : "e.g. Weekend shift"}
            className={inputClass}
          />
          <FieldError message={errors.description} />

          {suggestion && suggestion !== selected && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-brand-soft/60 px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-brand-dark">
                <Sparkles size={13} className="shrink-0" />
                <span className="truncate">Suggested category: {suggestion}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCategory(suggestion);
                    setSuggestion(null);
                  }}
                  className="rounded-lg bg-white px-2 py-1 text-[12px] font-medium text-brand-dark ring-1 ring-brand/30 transition hover:bg-white/80"
                >
                  Use
                </button>
                <button
                  type="button"
                  aria-label="Dismiss suggestion"
                  onClick={() => setSuggestion(null)}
                  className="rounded-lg p-1 text-brand-dark/70 transition hover:text-brand-dark"
                >
                  <X size={13} />
                </button>
              </span>
            </div>
          )}

          <label htmlFor="txn-amount" className={`mt-4 ${labelClass}`}>
            Amount
          </label>
          <input
            id="txn-amount"
            type="number"
            min={0}
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className={inputClass}
          />
          <FieldError message={errors.amount} />

          <label htmlFor="txn-category" className={`mt-4 ${labelClass}`}>
            Category
          </label>
          <CategoryInput
            id="txn-category"
            value={selected}
            onChange={(value) => {
              setCategory(value);
              setCategoryTouched(true);
              setAutoFilled(false);
            }}
            options={selectOptions}
            placeholder="Select a category"
            inputClassName={inputClass}
          />
          <FieldError message={errors.category} />
          {autoFilled && (
            <p className="mt-1 flex items-center gap-1 text-[12px] text-brand-dark">
              <Sparkles size={12} className="shrink-0" />
              Auto-matched from your description. Change it anytime.
            </p>
          )}

          <label htmlFor="txn-date" className={`mt-4 ${labelClass}`}>
            Date
          </label>
          <input
            id="txn-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
          <FieldError message={errors.date} />

          {/* Secondary details */}
          <div className="mt-5 border-t border-line pt-4">
            <label htmlFor="txn-notes" className={labelClass}>
              Notes <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="txn-notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything worth remembering"
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2 text-sm outline-none transition focus:border-brand"
            />

            <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(event) => setRecurring(event.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              <Repeat size={14} className="text-gray-500" />
              Make this recurring
            </label>

            {recurring && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="txn-frequency" className={labelClass}>
                    Frequency
                  </label>
                  <select
                    id="txn-frequency"
                    value={frequency}
                    onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}
                    className={inputClass}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="txn-end-date" className={labelClass}>
                    End <span className="font-normal text-gray-400">(optional)</span>
                  </label>
                  <input
                    id="txn-end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <FieldError message={errors.endDate} />
              </div>
            )}
          </div>

          <FieldError message={errors.form} />

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : type === "expense"
                  ? "Add Expense"
                  : "Add Income"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TransactionFormModal;
