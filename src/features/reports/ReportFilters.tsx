import type { ReportFilters as FiltersState, ReportRange } from "../../types";

interface ReportFiltersProps {
  filters: FiltersState;
  onChange: (next: FiltersState) => void;
  categoryOptions: string[];
  sourceOptions: string[];
  monthOptions: { value: string; label: string }[];
}

const selectClass =
  "h-10 min-w-0 rounded-xl border border-line bg-white px-2.5 text-[13px] text-gray-700 outline-none transition focus:border-brand";

/** Top-level report controls: range, month, category, type and income source. */
export function ReportFilters({
  filters,
  onChange,
  categoryOptions,
  sourceOptions,
  monthOptions,
}: ReportFiltersProps) {
  const hasFilters =
    filters.range !== "all" ||
    filters.month !== "" ||
    filters.category !== "" ||
    filters.type !== "all" ||
    filters.source !== "";

  function update(patch: Partial<FiltersState>) {
    const next = { ...filters, ...patch };
    // Income source only applies to income — don't strand an empty result.
    if (next.type === "expense") next.source = "";
    onChange(next);
  }

  return (
    <div className="mb-4 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,20,0.05)]">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.range}
          onChange={(event) => update({ range: event.target.value as ReportRange })}
          aria-label="Filter by date range"
          className={selectClass}
        >
          <option value="all">All dates</option>
          <option value="week">Last 7 days</option>
          <option value="month">This month</option>
          <option value="lastMonth">Last month</option>
          <option value="sixMonths">Last 6 months</option>
        </select>

        <select
          value={filters.month}
          onChange={(event) => update({ month: event.target.value })}
          aria-label="Filter by month"
          className={selectClass}
        >
          <option value="">Every month</option>
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(event) => update({ category: event.target.value })}
          aria-label="Filter by category"
          className={selectClass}
        >
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(event) => update({ type: event.target.value as FiltersState["type"] })}
          aria-label="Filter by type"
          className={selectClass}
        >
          <option value="all">Income & expense</option>
          <option value="income">Income only</option>
          <option value="expense">Expense only</option>
        </select>

        <select
          value={filters.source}
          onChange={(event) => update({ source: event.target.value })}
          aria-label="Filter by income source"
          className={selectClass}
          disabled={filters.type === "expense"}
        >
          <option value="">All income sources</option>
          {sourceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              onChange({ range: "all", month: "", category: "", type: "all", source: "" })
            }
            className="h-10 rounded-xl px-3 text-[13px] font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default ReportFilters;
