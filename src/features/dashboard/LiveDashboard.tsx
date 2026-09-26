import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card } from "../../components/StateViews";
import DashboardHeader from "./DashboardHeader";
import TransactionFormModal from "../transactions/TransactionFormModal";
import type { TransactionDraft, TransactionType } from "../../types";
import { createTransaction } from "../../services/transactionService";
import { toast } from "../../services/toast";

interface LayoutContext {
  openMenu: () => void;
}

export function LiveDashboard() {
  const { openMenu } = useOutletContext<LayoutContext>();
  const navigate = useNavigate();
  const [quickAddType, setQuickAddType] = useState<TransactionType | null>(null);

  async function addTransaction(draft: TransactionDraft) {
    const result = await createTransaction(draft);
    if (result.ok) {
      toast.success(draft.recurring ? "Recurring entry scheduled." : draft.type === "income" ? "Income added." : "Expense added.");
    }
    return result;
  }
  return (
    <>
      <DashboardHeader onOpenMenu={openMenu} />
      <Card title="Your dashboard">
        <p className="text-sm text-gray-600">
          Your profile setup is saved. Live balances, transactions and budgets will appear as their API rollout phases are enabled.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setQuickAddType("income")} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white">Add income</button>
          <button type="button" onClick={() => setQuickAddType("expense")} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white">Add expense</button>
          <button type="button" onClick={() => navigate("/transactions")} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-gray-700">View transactions</button>
        </div>
      </Card>
      {quickAddType && (
        <TransactionFormModal
          mode="add"
          initialType={quickAddType}
          onClose={() => setQuickAddType(null)}
          onSubmit={addTransaction}
        />
      )}
    </>
  );
}
