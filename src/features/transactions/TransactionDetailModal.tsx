import { useEffect } from "react";
import { ArrowDownLeft, Pencil, Repeat, Trash2, X } from "lucide-react";
import type { Transaction } from "../../types";
import { formatDayLabel, formatNaira } from "../../utils/format";
import { CATEGORY_ICONS, FALLBACK_ICON, getCategoryMeta, transactionIconKey } from "../../utils/categoryMeta";

interface TransactionDetailModalProps {
  transaction: Transaction;
  iconKey?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-[13px] text-gray-500">{label}</dt>
      <dd className="text-right text-sm text-gray-900">{value}</dd>
    </div>
  );
}

/** Full record view with edit and delete actions. */
export function TransactionDetailModal({
  transaction,
  iconKey,
  onEdit,
  onDelete,
  onClose,
}: TransactionDetailModalProps) {
  const isIncome = transaction.type === "income";
  const meta = getCategoryMeta(transaction.category);
  const iconKeyForTxn = transactionIconKey(transaction.description, transaction.category, iconKey);
  const Icon = isIncome ? ArrowDownLeft : CATEGORY_ICONS[iconKeyForTxn] ?? FALLBACK_ICON;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
        aria-labelledby="txn-detail-title"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isIncome ? "bg-brand-soft text-brand-dark" : meta.tint
              }`}
            >
              <Icon size={17} />
            </span>
            <div className="min-w-0">
              <h2 id="txn-detail-title" className="truncate text-base font-semibold text-gray-900">
                {transaction.description}
              </h2>
              <p className="text-[13px] text-gray-500">
                {isIncome ? "Income" : "Expense"} · {transaction.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </header>

        <p className={`mt-4 text-2xl font-semibold ${isIncome ? "text-brand-dark" : "text-gray-900"}`}>
          {isIncome ? "+" : "-"}
          {formatNaira(transaction.amount)}
        </p>

        <dl className="mt-4 divide-y divide-line border-t border-line">
          <DetailRow label="Date" value={formatDayLabel(transaction.date)} />
          <DetailRow label="Category" value={transaction.category} />
          <DetailRow
            label="Recurring"
            value={
              transaction.recurring
                ? `Repeats ${(transaction.frequency ?? "monthly").toLowerCase()}${
                    transaction.endDate ? ` until ${formatDayLabel(transaction.endDate)}` : ""
                  }`
                : "No"
            }
          />
          <DetailRow label="Notes" value={transaction.notes?.trim() || "No notes"} />
        </dl>

        {transaction.recurring && (
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-brand-dark">
            <Repeat size={13} /> This entry repeats on its own schedule.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-white py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Pencil size={15} /> Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailModal;
