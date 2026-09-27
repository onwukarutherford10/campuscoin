import { ArrowDownLeft, ArrowUpRight, Repeat } from "lucide-react";
import type { Transaction } from "../../types";
import { EmptyState } from "../../components/StateViews";
import { formatDayLabel, formatNaira } from "../../utils/format";
import { CATEGORY_ICONS, transactionIconKey } from "../../utils/categoryMeta";

interface RecentTransactionsProps {
  transactions: Transaction[];
  onAddTransaction: () => void;
  onViewAll: () => void;
}

const INCOME_SOURCES = ["Allowance", "Part-time job", "Scholarship", "Gig or freelance work", "Gifts", "Other income"];

/** Latest transactions with a clear income/expense distinction. */
export function RecentTransactions({ transactions, onAddTransaction, onViewAll }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Add your first income or expense to start seeing your spending patterns."
        actionLabel="Add transaction"
        onAction={onAddTransaction}
      />
    );
  }

  const latest = transactions.slice(0, 6);

  return (
    <div>
      <ul className="divide-y divide-line">
        {latest.map((transaction) => {
          const isIncome = transaction.type === "income";
          const iconKeyForTxn = transactionIconKey(transaction.description, transaction.category);
          const Icon = isIncome ? ArrowDownLeft : CATEGORY_ICONS[iconKeyForTxn] ?? ArrowUpRight;
          const isIncomeSource = INCOME_SOURCES.includes(transaction.category);

          return (
            <li key={transaction.id} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isIncome ? "bg-brand-soft text-brand-dark" : "bg-gray-100 text-gray-600"
                }`}
              >
                <Icon size={17} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{transaction.description}</p>
                <p className="text-[13px] text-gray-500">
                  {isIncome && !isIncomeSource ? "Income" : transaction.category} · {formatDayLabel(transaction.date)}
                  {transaction.recurring && (
                    <span
                      className="ml-1.5 inline-flex items-center gap-0.5 text-brand-dark"
                      title={`Repeats ${(transaction.frequency ?? "monthly").toLowerCase()}`}
                    >
                      <Repeat size={11} />
                      Repeats
                    </span>
                  )}
                </p>
              </div>

              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  isIncome ? "text-brand-dark" : "text-gray-900"
                }`}
              >
                {isIncome ? <ArrowDownLeft size={14} /> : <span aria-hidden="true">-</span>}
                {formatNaira(transaction.amount)}
                <span className="sr-only">{isIncome ? "income" : "expense"}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onViewAll}
        className="mt-4 w-full rounded-xl border border-line bg-white py-2.5 text-[13px] font-medium text-gray-700 transition hover:bg-gray-50"
      >
        View all transactions
      </button>
    </div>
  );
}

export default RecentTransactions;
