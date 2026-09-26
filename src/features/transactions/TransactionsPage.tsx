import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Transaction, TransactionDraft, TransactionType } from "../../types";
import { useTransactions } from "../../hooks/useTransactions";
import { useCategories } from "../../hooks/useCategories";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Card, EmptyState, ErrorState } from "../../components/StateViews";
import { ListSkeleton } from "../../components/Skeletons";
import { toast } from "../../services/toast";
import TransactionFilters, { type DateFilter, type TypeFilter } from "./TransactionFilters";
import TransactionRow from "./TransactionRow";
import TransactionDetailModal from "./TransactionDetailModal";
import TransactionFormModal from "./TransactionFormModal";
import CsvImportModal from "../reports/CsvImportModal";
import { formatDayLabel } from "../../utils/format";

type FormState = { mode: "add"; type: TransactionType } | { mode: "edit"; transaction: Transaction };

interface LayoutContext {
  openMenu: () => void;
}

function daysAgoISO(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Complete transaction management: search, filters, grouped list, CRUD. */
export function TransactionsPage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const { items, loading, error, reload, create, update, remove } = useTransactions();
  const { items: categories } = useCategories();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [importing, setImporting] = useState(false);

  const iconKeys = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categories) map.set(category.name, category.icon);
    return map;
  }, [categories]);

  const categoryOptions = useMemo(
    () => [...new Set(items.map((entry) => entry.category))].sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const monthPrefix = daysAgoISO(0).slice(0, 7);
    const weekStart = daysAgoISO(6);

    return items.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (categoryFilter !== "all" && entry.category !== categoryFilter) return false;
      if (dateFilter === "month" && !entry.date.startsWith(monthPrefix)) return false;
      if (dateFilter === "week" && entry.date < weekStart) return false;
      if (text && !`${entry.description} ${entry.category} ${entry.notes ?? ""}`.toLowerCase().includes(text)) {
        return false;
      }
      return true;
    });
  }, [items, query, typeFilter, dateFilter, categoryFilter]);

  // Newest first — one continuous list, structured like a fintech feed.
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered],
  );

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setDateFilter("all");
    setCategoryFilter("all");
  }

  async function handleSubmitForm(draft: TransactionDraft) {
    const result =
      form && form.mode === "edit" ? await update(form.transaction.id, draft) : await create(draft);
    if (result.ok) {
      toast.success(form && form.mode === "edit" ? "Transaction updated." : "Transaction added.");
    }
    return result;
  }

  function openEdit(transaction: Transaction) {
    setDetail(null);
    setForm({ mode: "edit", transaction });
  }

  function openDelete(transaction: Transaction) {
    setDetail(null);
    setDeleteError("");
    setDeleteTarget(transaction);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await remove(deleteTarget.id);
    if (result.ok) {
      setDeleteTarget(null);
      setDeleteError("");
      toast.success("Transaction deleted.");
    } else {
      setDeleteError(result.error ?? "We couldn't delete that transaction.");
    }
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Everything you've earned and spent, in one place."
        onOpenMenu={openMenu}
        actions={
          <>
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Import CSV
            </button>
            <button
              type="button"
              onClick={() => setForm({ mode: "add", type: "income" })}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
            >
              Add income
            </button>
            <button
              type="button"
              onClick={() => setForm({ mode: "add", type: "expense" })}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Add expense
            </button>
          </>
        }
      />

      <TransactionFilters
        query={query}
        onQuery={setQuery}
        type={typeFilter}
        onType={setTypeFilter}
        date={dateFilter}
        onDate={setDateFilter}
        category={categoryFilter}
        onCategory={setCategoryFilter}
        categoryOptions={categoryOptions}
      />

      {loading && items.length === 0 && (
        <Card>
          <ListSkeleton rows={6} />
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No transactions yet."
          description="Add your first income or expense to start tracking your money."
          actionLabel="Add transaction"
          onAction={() => setForm({ mode: "add", type: "expense" })}
        />
      )}

      {!error && items.length > 0 && filtered.length === 0 && (
        <EmptyState
          title="No transactions match your filters."
          description="Try a different search or clear what you've selected."
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      )}

      {sorted.length > 0 && (
        <section className="sm:rounded-2xl sm:bg-white sm:p-5 sm:shadow-[0_1px_2px_rgba(16,24,20,0.05)]">
          <header className="mb-3 flex items-center justify-between gap-3 px-1 sm:mb-4 sm:px-0">
            <h2 className="text-[15px] font-semibold text-gray-900">Transactions</h2>
            <span className="text-[13px] text-gray-400">
              {sorted.length} of {items.length}
            </span>
          </header>
          <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-line">
            {sorted.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                iconKey={iconKeys.get(transaction.category)}
                onOpen={() => setDetail(transaction)}
                onEdit={() => openEdit(transaction)}
                onDelete={() => openDelete(transaction)}
              />
            ))}
          </ul>
        </section>
      )}

      {detail && (
        <TransactionDetailModal
          transaction={detail}
          iconKey={iconKeys.get(detail.category)}
          onEdit={() => openEdit(detail)}
          onDelete={() => openDelete(detail)}
          onClose={() => setDetail(null)}
        />
      )}

      {form && (
        <TransactionFormModal
          mode={form.mode}
          initialType={form.mode === "add" ? form.type : undefined}
          initial={form.mode === "edit" ? form.transaction : undefined}
          onClose={() => setForm(null)}
          onSubmit={handleSubmitForm}
        />
      )}

      {importing && <CsvImportModal onClose={() => setImporting(false)} onImported={reload} />}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`"${deleteTarget.description}" (${formatDayLabel(deleteTarget.date)}) will be removed permanently. This can't be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError("");
          }}
        >
          {deleteError && <p className="mt-3 text-[13px] text-red-600">{deleteError}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}

export default TransactionsPage;
