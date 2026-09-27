import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Budget, ServiceResult } from "../../types";
import { useBudgets } from "../../hooks/useBudgets";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Card, EmptyState, ErrorState } from "../../components/StateViews";
import { ListSkeleton } from "../../components/Skeletons";
import { toast } from "../../services/toast";
import BudgetRow from "./BudgetRow";
import BudgetFormModal from "./BudgetFormModal";

interface LayoutContext {
  openMenu: () => void;
}

type FormState = { mode: "add" } | { mode: "edit"; budget: Budget };

/** Monthly budgets: set limits, track progress, catch overspending early. */
export function BudgetsPage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const { items, loading, error, reload, save, remove } = useBudgets();
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await remove(deleteTarget.id);
    if (result.ok) {
      setDeleteTarget(null);
      setDeleteError("");
      toast.success("Budget deleted.");
    } else {
      setDeleteError(result.error ?? "We couldn't delete that budget.");
    }
  }

  async function handleSave(input: { id?: string; category: string; limit: number }): Promise<ServiceResult<Budget>> {
    const wasEdit = Boolean(input.id);
    const result = await save(input);
    if (result.ok) toast.success(wasEdit ? "Budget updated." : "Budget set.");
    return result;
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Monthly limits per spending category."
        onOpenMenu={openMenu}
        actions={
          <>
            <button
              type="button"
              onClick={() => setForm({ mode: "add" })}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
            >
              Set a budget
            </button>
          </>
        }
      />

      {loading && items.length === 0 && (
        <Card>
          <ListSkeleton rows={4} />
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No budgets set yet."
          description="Create category budgets to keep your spending on track."
          actionLabel="Create a budget"
          onAction={() => setForm({ mode: "add" })}
        />
      )}

      {!error && items.length > 0 && (
        <Card title="Monthly budgets" action={<span className="text-[13px] text-gray-400">{items.length} categories</span>}>
          <ul className="divide-y divide-line">
            {items.map((budget) => (
              <BudgetRow
                key={budget.id}
                budget={budget}
                onEdit={() => setForm({ mode: "edit", budget })}
                onDelete={() => {
                  setDeleteError("");
                  setDeleteTarget(budget);
                }}
              />
            ))}
          </ul>
        </Card>
      )}

      {form && (
        <BudgetFormModal
          mode={form.mode}
          budget={form.mode === "edit" ? form.budget : undefined}
          budgets={items}
          onClose={() => setForm(null)}
          onSubmit={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete budget?"
          message={`The ${deleteTarget.category} budget and its progress will be removed. Your transactions stay untouched.`}
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

export default BudgetsPage;
