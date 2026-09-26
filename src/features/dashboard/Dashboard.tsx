import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useDashboardData } from "../../hooks/useDashboardData";
import { createTransaction } from "../../services/transactionService";
import type { TransactionDraft, TransactionType } from "../../types";
import DashboardHeader from "./DashboardHeader";
import FinancialSummaryCard from "./FinancialSummaryCard";
import SpendingOverview from "./SpendingOverview";
import BudgetOverview from "./BudgetOverview";
import SavingTipCard from "./SavingTipCard";
import InsightBanner from "./InsightBanner";
import RecentTransactions from "./RecentTransactions";
import ReportsCard from "./ReportsCard";
import TransactionFormModal from "../transactions/TransactionFormModal";
import { Card, ErrorState } from "../../components/StateViews";
import { toast } from "../../services/toast";
import { ListSkeleton, SummarySkeleton } from "../../components/Skeletons";

interface LayoutContext {
  openMenu: () => void;
}

/** Primary screen: financial status first, then activity and interpretation. */
export function Dashboard() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const { data, loading, error, reload } = useDashboardData();
  const [quickAddType, setQuickAddType] = useState<TransactionType | null>(null);
  const navigate = useNavigate();

  function handleQuickAdd(draft: TransactionDraft) {
    return createTransaction(draft).then((result) => {
      if (result.ok) {
        toast.success(draft.type === "income" ? "Income added." : "Expense added.");
        reload();
      }
      return result;
    });
  }

  return (
    <>
      <DashboardHeader onOpenMenu={openMenu} />

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
        <div className="rounded-2xl bg-white p-6">
          <ErrorState onRetry={reload} />
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Balance first, quick actions live on the summary card itself. */}
          <FinancialSummaryCard
            summary={data.summary}
            onAddIncome={() => setQuickAddType("income")}
            onAddExpense={() => setQuickAddType("expense")}
          />

          {/* Spending → budgets */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Spending overview" className="lg:col-span-2">
              <SpendingOverview data={data.spending} onAddTransaction={() => setQuickAddType("expense")} />
            </Card>

            <Card title="Budget overview">
              <BudgetOverview budgets={data.budgets} onSetBudget={() => navigate("/budgets")} />
            </Card>
          </div>

          {/* Insights: monthly narrative, tips, six-month reports */}
          <InsightBanner insight={data.insight} onViewReports={() => navigate("/reports")} />

          <div className="grid gap-5 lg:grid-cols-3">
            <SavingTipCard tip={data.tip} />

            <Card title="Reports" action={<span className="text-[13px] text-gray-400">6 months</span>} className="lg:col-span-2">
              <ReportsCard trend={data.trend} />
            </Card>
          </div>

          {/* Recent activity last */}
          <Card title="Recent transactions">
            <RecentTransactions
              transactions={data.transactions}
              onAddTransaction={() => setQuickAddType("expense")}
              onViewAll={() => navigate("/transactions")}
            />
          </Card>
        </div>
      )}

      {quickAddType && (
        <TransactionFormModal
          mode="add"
          initialType={quickAddType}
          onClose={() => setQuickAddType(null)}
          onSubmit={handleQuickAdd}
        />
      )}
    </>
  );
}

export default Dashboard;
