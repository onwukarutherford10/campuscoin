import { useEffect } from "react";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import LandingPage from "./features/landing/LandingPage";
import Login from "./features/auth/Login";
import SignUp from "./features/auth/SignUp";
import OtpPage from "./features/auth/Otp";
import Dashboard from "./features/dashboard/Dashboard";
import ForgetPassword from "./features/auth/ForgetPassword";
import ResetPassword from "./features/auth/ResetPassword";
import Onboarding from "./features/onboarding/Onboarding";
import OnboardingComplete from "./features/onboarding/OnboardingComplete";
import TransactionsPage from "./features/transactions/TransactionsPage";
import BudgetsPage from "./features/budgets/BudgetsPage";
import CategoriesPage from "./features/categories/CategoriesPage";
import ReportsPage from "./features/reports/ReportsPage";
import ProfilePage from "./features/profile/ProfilePage";
import DashboardLayout from "./layouts/DashboardLayout";
import RequireAuth from "./auth/RequireAuth";
import { ToastHost } from "./components/ToastHost";
import { DATA_MODE } from "./services/api/config.ts";
import { restoreSession } from "./auth/liveAuth.ts";
import { LiveFeaturePending } from "./components/LiveFeaturePending.tsx";


function ProtectedLayout() {
  return (
    <RequireAuth>
      {DATA_MODE === "live" ? <LiveFeaturePending title="Your dashboard" /> : <DashboardLayout />}
    </RequireAuth>
  );
}

function ProtectedOnboarding() {
  return (
    <RequireAuth>
      {DATA_MODE === "live" ? <LiveFeaturePending title="Onboarding" /> : <Onboarding />}
    </RequireAuth>
  );
}

function ProtectedOnboardingComplete() {
  return (
    <RequireAuth>
      {DATA_MODE === "live" ? <LiveFeaturePending title="Onboarding" /> : <OnboardingComplete />}
    </RequireAuth>
  );
}

/** Signup verification screen — requires the session created during signup. */
function ProtectedOtp() {
  return (
    <RequireAuth allowUnverified>
      <OtpPage />
    </RequireAuth>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  {path: "/login", element: <Login/>},
  { path: "/signup", element: <SignUp /> },
  { path: "/otp", element: <ProtectedOtp /> },
  { path: "/forgetpassword", element: <ForgetPassword /> },
  { path: "/resetpassword", element: <ResetPassword /> },
  { path: "/onboarding", element: <ProtectedOnboarding /> },
  { path: "/onboarding/complete", element: <ProtectedOnboardingComplete /> },
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/transactions", element: <TransactionsPage /> },
      { path: "/budgets", element: <BudgetsPage /> },
      { path: "/categories", element: <CategoriesPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/settings", element: <ProfilePage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

function App() {
  useEffect(() => {
    if (DATA_MODE === "live") void restoreSession();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>
  );
}

export default App;
