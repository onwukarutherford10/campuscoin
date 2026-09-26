import { Search } from "lucide-react";
import type { TransactionType } from "../../types";
import { CategoryInput } from "../../components/CategoryInput";

export type TypeFilter = "all" | TransactionType;
export type DateFilter = "all" | "month" | "week";

interface TransactionFiltersProps {
  query: string;
  onQuery: (value: string) => void;
  type: TypeFilter;
  onType: (value: TypeFilter) => void;
  date: DateFilter;
  onDate: (value: DateFilter) => void;
  category: string;
  onCategory: (value: string) => void;
  categoryOptions: string[];
}

const selectClass =
  "h-10 min-w-0 rounded-xl border border-line bg-white px-2.5 text-[13px] text-gray-700 outline-none transition focus:border-brand";

/** Search plus date/type/category filters in a single wrapping row. */
export function TransactionFilters({
  query,
  onQuery,
  type,
  onType,
  date,
  onDate,
  category,
  onCategory,
  categoryOptions,
}: TransactionFiltersProps) {
  const hasFilters = query !== "" || type !== "all" || date !== "all" || category !== "all";

  return (
    <div className="mb-4 rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(16,24,20,0.05)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400" />
          <CategoryInput
            type="search"
            value={query}
            onChange={onQuery}
            options={categoryOptions}
            ariaLabel="Search transactions"
            placeholder="Search transactions"
            onPick={(option) => {
              onQuery("");
              onCategory(option);
            }}
            inputClassName="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none transition focus:border-brand"
          />
        </div>

        <select value={date} onChange={(event) => onDate(event.target.value as DateFilter)} aria-label="Filter by date" className={selectClass}>
          <option value="all">All dates</option>
          <option value="month">This month</option>
          <option value="week">Last 7 days</option>
        </select>

        <select value={type} onChange={(event) => onType(event.target.value as TypeFilter)} aria-label="Filter by type" className={selectClass}>
          <option value="all">Income & expense</option>
          <option value="income">Income only</option>
          <option value="expense">Expense only</option>
        </select>

        <select value={category} onChange={(event) => onCategory(event.target.value)} aria-label="Filter by category" className={selectClass}>
          <option value="all">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              onQuery("");
              onType("all");
              onDate("all");
              onCategory("all");
            }}
            className="h-10 rounded-xl px-3 text-[13px] font-medium text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export default TransactionFilters;
