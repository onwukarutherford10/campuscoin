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
import { DATA_MODE } from "../../services/api/config";
import { calendarDate, dateAtLocalTime } from "../../services/transactionService";

type FormState = { mode: "add"; type: TransactionType } | { mode: "edit"; transaction: Transaction };

interface LayoutContext {
  openMenu: () => void;
}

function dateBounds(filter: DateFilter): { from?: string; to?: string } {
  if (filter === "all") return {};
  const now = new Date();
  const today = calendarDate(now.toISOString());
  let firstDate = `${today.slice(0, 7)}-01`;
  if (filter === "week") {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - 6);
    firstDate = day.toISOString().slice(0, 10);
  }
  return { from: dateAtLocalTime(firstDate, 0), to: now.toISOString() };
}

/** Complete transaction management: search, filters, grouped list, CRUD. */
export function TransactionsPage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const bounds = dateBounds(dateFilter);
  const { items, loading, error, reload, create, update, remove, total, perPage } = useTransactions({
    page,
    perPage: 25,
    query,
    type: typeFilter === "all" ? undefined : typeFilter,
    categoryId: categoryFilter === "all" ? undefined : categoryFilter,
    ...bounds,
  });
  const { items: categories } = useCategories();

  const iconKeys = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const category of categories) map.set(category.name, category.icon);
    return map;
  }, [categories]);

  const sorted = useMemo(() => [...items].sort((a, b) => b.date.localeCompare(a.date)), [items]);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasActiveFilters = query !== "" || typeFilter !== "all" || dateFilter !== "all" || categoryFilter !== "all";

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setDateFilter("all");
    setCategoryFilter("all");
    setPage(1);
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
            {DATA_MODE === "mock" && (
              <button type="button" onClick={() => setImporting(true)} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50">Import CSV</button>
            )}
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
        onQuery={(value) => { setQuery(value); setPage(1); }}
        type={typeFilter}
        onType={(value) => { setTypeFilter(value); setPage(1); }}
        date={dateFilter}
        onDate={(value) => { setDateFilter(value); setPage(1); }}
        category={categoryFilter}
        onCategory={(value) => { setCategoryFilter(value); setPage(1); }}
        categoryOptions={categories}
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

      {!loading && !error && total === 0 && !hasActiveFilters && (
        <EmptyState
          title="No transactions yet."
          description="Add your first income or expense to start tracking your money."
          actionLabel="Add transaction"
          onAction={() => setForm({ mode: "add", type: "expense" })}
        />
      )}

      {!loading && !error && total === 0 && hasActiveFilters && (
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
              {sorted.length} of {total}
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

      {!error && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Transaction pages">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl border border-line bg-white px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </nav>
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
