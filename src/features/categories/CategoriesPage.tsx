import { useState, type FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Category, TransactionType } from "../../types";
import { useCategories } from "../../hooks/useCategories";
import { CategoryInput } from "../../components/CategoryInput";
import PageHeader from "../../components/PageHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import { Card, ErrorState } from "../../components/StateViews";
import { ListSkeleton, Skeleton } from "../../components/Skeletons";
import { toast } from "../../services/toast";
import { CATEGORY_ICONS, FALLBACK_ICON, ICON_PRESETS } from "../../utils/categoryMeta";

interface LayoutContext {
  openMenu: () => void;
}

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-line px-3 text-sm outline-none transition focus:border-brand";

function CategoryList({
  title,
  type,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  type: TransactionType;
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const rows = categories.filter((entry) => entry.type === type);

  return (
    <Card title={title} action={<span className="text-[13px] text-gray-400">{rows.length}</span>}>
      <ul className="divide-y divide-line">
        {rows.map((category) => {
          const Icon =
            (category.icon ? CATEGORY_ICONS[category.icon] : undefined) ??
            CATEGORY_ICONS[category.name] ??
            FALLBACK_ICON;
          return (
            <li key={category.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-gray-900">{category.name}</span>
                <span className="text-[12px] text-gray-400">{category.isSystem ? "Default" : "Personal"}</span>
              </span>
              {!category.isSystem && (
                <>
                  <button
                    type="button"
                    aria-label={`Edit ${category.name}`}
                    onClick={() => onEdit(category)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => onDelete(category)}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Create, edit and remove personal categories alongside the seeded defaults. */
export function CategoriesPage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const { items, loading, error, reload, create, update, remove } = useCategories();

  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [icon, setIcon] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState("");

  function startEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon ?? "");
    setErrors({});
  }

  function cancelEdit() {
    setEditing(null);
    setName("");
    setIcon("");
    setErrors({});
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const result = editing
      ? await update(editing.id, { name, icon: icon || null })
      : await create({ name, type, icon: icon || null });
    setSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.error) setErrors({ form: result.error });
      return;
    }
    toast.success(editing ? "Category updated." : "Category added.");
    cancelEdit();
    setName("");
    setIcon("");
    setErrors({});
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const result = await remove(deleteTarget.id);
    if (result.ok) {
      setDeleteTarget(null);
      setDeleteError("");
      toast.success("Category deleted.");
    } else {
      setDeleteError(result.error ?? "We couldn't delete that category.");
    }
  }

  return (
    <>
      <PageHeader
        title={editing ? `Edit “${editing.name}”` : "Manage categories"}
        subtitle="Personal categories sit alongside the defaults."
        onOpenMenu={openMenu}
        actions={
          <Link
            to="/settings"
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft size={15} />
            Back to settings
          </Link>
        }
      />

      {loading && items.length === 0 && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card>
            <ListSkeleton rows={5} />
          </Card>
          <Card>
            <ListSkeleton rows={5} />
          </Card>
          <Card>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-11 w-full" />
            <Skeleton className="mt-4 h-11 w-full" />
          </Card>
        </div>
      )}

      {error && (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      )}

      {!loading && !error && (
        <div className="grid gap-5 lg:grid-cols-3">
          <CategoryList
            title="Expense categories"
            type="expense"
            categories={items}
            onEdit={startEdit}
            onDelete={(category) => {
              setDeleteError("");
              setDeleteTarget(category);
            }}
          />

          <CategoryList
            title="Income categories"
            type="income"
            categories={items}
            onEdit={startEdit}
            onDelete={(category) => {
              setDeleteError("");
              setDeleteTarget(category);
            }}
          />

          <Card title={editing ? "Edit category" : "Add category"}>
            <form onSubmit={handleSave}>
              <label htmlFor="category-name" className="block text-[13px] font-medium text-gray-700">
                Category name
              </label>
              <CategoryInput
                id="category-name"
                value={name}
                onChange={setName}
                options={items.map((entry) => entry.name)}
                placeholder="e.g. Gym membership"
                inputClassName={inputClass}
                onPick={(value) => {
                  // Typing a name that already exists offers the shortcut
                  // straight into editing that category instead.
                  const existing = items.find((entry) => entry.name === value);
                  if (existing && !editing) startEdit(existing);
                }}
              />
              {errors.name && <p className="mt-1 text-[13px] text-red-600">{errors.name}</p>}

              {!editing && (
                <>
                  <span className="mt-4 block text-[13px] font-medium text-gray-700">Type</span>
                  <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                    {(["expense", "income"] as TransactionType[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={type === option}
                        onClick={() => setType(option)}
                        className={`rounded-lg py-2 text-sm font-medium capitalize transition ${
                          type === option ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {errors.type && <p className="mt-1 text-[13px] text-red-600">{errors.type}</p>}
                </>
              )}

              <label htmlFor="category-icon" className="mt-4 block text-[13px] font-medium text-gray-700">
                Icon <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                id="category-icon"
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                className={inputClass}
              >
                <option value="">Auto</option>
                {ICON_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>

              {errors.form && <p className="mt-3 text-[13px] text-red-600">{errors.form}</p>}

              <div className="mt-5 flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {submitting ? "Saving…" : editing ? "Save changes" : "Add category"}
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete category?"
          message={`"${deleteTarget.name}" will be removed. Categories in use by transactions or budgets are protected.`}
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

export default CategoriesPage;
