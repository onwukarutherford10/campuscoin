import { useState } from "react";
import { ArrowDownLeft, EllipsisVertical, Eye, Pencil, Repeat, Trash2 } from "lucide-react";
import type { Transaction } from "../../types";
import { formatDayLabel, formatNaira } from "../../utils/format";
import { CATEGORY_ICONS, FALLBACK_ICON, getCategoryMeta, transactionIconKey } from "../../utils/categoryMeta";

interface TransactionRowProps {
  transaction: Transaction;
  /** Preset icon key when the transaction's category is a personal one. */
  iconKey?: string | null;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * One transaction line in the fintech-style list (never a table):
 * icon, description, category, date, amount, income/expense and actions.
 * On mobile the row becomes a self-contained card.
 */
export function TransactionRow({ transaction, iconKey, onOpen, onEdit, onDelete }: TransactionRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isIncome = transaction.type === "income";
  const meta = getCategoryMeta(transaction.category);
  const iconKeyForTxn = transactionIconKey(transaction.description, transaction.category, iconKey);
  const Icon = isIncome ? ArrowDownLeft : CATEGORY_ICONS[iconKeyForTxn] ?? FALLBACK_ICON;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <li className="relative flex items-center gap-2 rounded-2xl border border-line bg-white p-3 shadow-sm sm:gap-3 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:py-3 sm:shadow-none">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isIncome ? "bg-brand-soft text-brand-dark" : meta.tint
          }`}
        >
          <Icon size={17} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-900">
            {transaction.description}
          </span>
          <span className="flex flex-wrap items-center gap-1 text-[13px] text-gray-500">
            <span className="truncate">{transaction.category}</span>
            <span className="text-gray-400 md:hidden">
              <span aria-hidden="true">· </span>
              {formatDayLabel(transaction.date)}
            </span>
            {transaction.recurring && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 text-brand-dark"
                title={`Repeats ${transaction.frequency ?? "monthly"}`}
              >
                <Repeat size={11} />
                {transaction.frequency === "weekly" ? "Weekly" : "Monthly"}
              </span>
            )}
          </span>
        </span>
      </button>

      {/* Desktop: dedicated date column keeps the list structured. */}
      <span className="hidden w-20 shrink-0 text-right text-[13px] text-gray-500 md:block">
        {formatDayLabel(transaction.date)}
      </span>

      <span
        className={`shrink-0 text-sm font-medium ${isIncome ? "text-brand-dark" : "text-gray-900"}`}
      >
        {isIncome ? "+" : "-"}
        {formatNaira(transaction.amount)}
        <span className="sr-only">{isIncome ? " income" : " expense"}</span>
      </span>

      <button
        type="button"
        aria-label={`More actions for ${transaction.description}`}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
      >
        <EllipsisVertical size={17} />
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={closeMenu}
          />
          <div className="absolute right-0 top-10 z-40 w-36 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onOpen();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <Eye size={15} /> Details
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <Pencil size={15} /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default TransactionRow;
