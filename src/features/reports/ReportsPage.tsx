import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { FileDown, FileImage, Upload } from "lucide-react";
import type { ReportData, ReportFilters, SavingTip } from "../../types";
import { getReportData } from "../../services/reportService";
import {
  bookmarkTip,
  dismissTip,
  removeSavedTip,
} from "../../services/tipsService";
import { exportReport, type ExportPayload } from "../../services/reportExport";
import { useCategories } from "../../hooks/useCategories";
import PageHeader from "../../components/PageHeader";
import { Card, EmptyState, ErrorState } from "../../components/StateViews";
import { ListSkeleton, SummarySkeleton } from "../../components/Skeletons";
import { toast } from "../../services/toast";
import ReportFiltersBar from "./ReportFilters";
import MonthlySummaryCard from "./MonthlySummaryCard";
import CategoryBreakdownCard from "./CategoryBreakdownCard";
import TrendCard from "./TrendCard";
import CurrentMonthCard from "./CurrentMonthCard";
import InsightCard from "./InsightCard";
import PastInsightsCard from "./PastInsightsCard";
import TipsSection from "./TipsSection";
import CsvImportModal from "./CsvImportModal";
import { DATA_MODE } from "../../services/api/config";

interface LayoutContext {
  openMenu: () => void;
}

const DEFAULT_FILTERS: ReportFilters = {
  range: "all",
  month: "",
  category: "",
  type: "all",
  source: "",
};

/** Last six months as select options, newest first. */
function lastSixMonths(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let back = 0; back < 6; back += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - back, 1);
    options.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-NG", { month: "long", year: "numeric" }),
    });
  }
  return options;
}

/** Phase 3 hub: filtered analysis, insight history, tips and export. */
export function ReportsPage() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const { items: categories } = useCategories();

  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestId, setRequestId] = useState(0);
  const [tipsBusy, setTipsBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    setRequestId((id) => id + 1);
  }, []);

  /** Filter changes run in an event handler so the effect only fetches. */
  const handleFilters = useCallback((next: ReportFilters) => {
    setFilters(next);
    setLoading(true);
    setError(false);
  }, []);

  useEffect(() => {
    let active = true;

    getReportData(filters)
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, requestId]);

  const categoryOptions = useMemo(
    () => [...new Set(categories.map((entry) => entry.name))].sort(),
    [categories],
  );
  const sourceOptions = useMemo(
    () => categories.filter((entry) => entry.type === "income").map((entry) => entry.name),
    [categories],
  );
  const monthOptions = useMemo(() => lastSixMonths(), []);

  async function runTipAction(action: () => Promise<SavingTip[]>, message: string) {
    setTipsBusy(true);
    try {
      await action();
      toast.success(message);
      reload();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "We couldn't update that tip.");
    } finally {
      setTipsBusy(false);
    }
  }

  function buildPayload(): ExportPayload | null {
    if (!data) return null;
    return {
      summary: data.summary,
      categories: data.categories,
      budgets: data.budgets,
      insight: data.insight,
      generatedAt: new Date().toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }

  async function handleExport(format: "pdf" | "png") {
    const payload = buildPayload();
    if (!payload) return;
    setExporting(format);
    try {
      await exportReport(format, filters, categories, payload);
      toast.success(`Report downloaded as ${format.toUpperCase()}.`);
    } catch (exportError) {
      toast.error(exportError instanceof Error ? exportError.message : "We couldn't export that report.");
    } finally {
      setExporting(null);
    }
  }

  const activeFilters =
    filters.range !== "all" ||
    filters.month !== "" ||
    filters.category !== "" ||
    filters.type !== "all" ||
    filters.source !== "";

  const noMatches =
    data !== null &&
    data.hasTransactions &&
    data.summary.income === 0 &&
    data.summary.expenses === 0 &&
    activeFilters;

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Where your money went, explained in plain language."
        onOpenMenu={openMenu}
        actions={
          <>
            <button
              type="button"
              onClick={() => setImporting(true)}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <Upload size={15} />
                Import CSV
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("pdf")}
              disabled={!data || exporting !== null}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                <FileDown size={15} />
                {exporting === "pdf" ? "Preparing…" : "Export PDF"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void handleExport("png")}
              disabled={!data || exporting !== null}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                <FileImage size={15} />
                {exporting === "png" ? "Preparing…" : "Export image"}
              </span>
            </button>
          </>
        }
      />

      <ReportFiltersBar
        filters={filters}
        onChange={handleFilters}
        categoryOptions={categoryOptions}
        sourceOptions={sourceOptions}
        monthOptions={monthOptions}
      />

      {loading && !data && (
        <div className="space-y-5">
          <SummarySkeleton />
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <ListSkeleton rows={5} />
            </Card>
            <Card>
              <ListSkeleton rows={4} />
            </Card>
          </div>
        </div>
      )}

      {error && (
        <Card>
          <ErrorState onRetry={reload} />
        </Card>
      )}

      {data && !data.hasTransactions && (
        <EmptyState
          title="No transactions to report on yet"
          description="Add income or expenses first and your reports will build themselves."
          actionLabel="Go to transactions"
          onAction={() => navigate("/transactions")}
        />
      )}

      {data && data.hasTransactions && noMatches && (
        <EmptyState
          title="No transactions match your filters"
          description="Try a wider date range or clear what you've selected."
          actionLabel="Clear filters"
          onAction={() => setFilters(DEFAULT_FILTERS)}
        />
      )}

      {data && data.hasTransactions && !noMatches && (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <MonthlySummaryCard summary={data.summary} />
          </div>

          <div className="lg:col-span-2">
            <CategoryBreakdownCard
              categories={data.categories}
              interpretation={data.interpretation}
            />
          </div>
          <TrendCard trend={data.trend} />

          <CurrentMonthCard
            report={data.currentMonth}
            monthLabel={new Date().toLocaleDateString("en-NG", { month: "long" })}
          />
          <div className="lg:col-span-2">
            <InsightCard insight={data.insight} />
          </div>

          <TipsSection
            tips={data.tips}
            savedTips={data.savedTips}
            busy={tipsBusy}
            onBookmark={(tip) => runTipAction(
              () => bookmarkTip(tip),
              tip.bookmarked ? "Removed from saved tips." : "Tip saved for later.",
            )}
            onDismiss={(tip) => runTipAction(() => dismissTip(tip), "Tip dismissed. Point taken.")}
            onRemoveSaved={(id) => runTipAction(() => removeSavedTip(id), "Removed from saved tips.")}
          />

          {DATA_MODE === "mock" && (
            <div className="lg:col-span-3">
              <PastInsightsCard insights={data.pastInsights} />
            </div>
          )}
        </div>
      )}

      {activeFilters && data && data.hasTransactions && !noMatches && (
        <p className="mt-4 text-center text-[12px] text-gray-400">
          The summary and category breakdown follow your filters. Current-month and six-month cards keep their stated periods.
        </p>
      )}

      {importing && (
        <CsvImportModal
          onClose={() => setImporting(false)}
          onImported={reload}
        />
      )}
    </>
  );
}

export default ReportsPage;
