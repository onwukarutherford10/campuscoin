import { useOutletContext } from "react-router-dom";
import { Card } from "../../components/StateViews";
import DashboardHeader from "./DashboardHeader";

interface LayoutContext {
  openMenu: () => void;
}

export function LiveDashboard() {
  const { openMenu } = useOutletContext<LayoutContext>();
  return (
    <>
      <DashboardHeader onOpenMenu={openMenu} />
      <Card title="Your dashboard">
        <p className="text-sm text-gray-600">
          Your profile setup is saved. Live balances, transactions and budgets will appear as their API rollout phases are enabled.
        </p>
      </Card>
    </>
  );
}
