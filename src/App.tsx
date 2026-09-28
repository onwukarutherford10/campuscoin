import { useEffect } from "react";
import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import MarketingLayout from "./layouts/MarketingLayout";
import HomePage from "./features/landing/pages/HomePage";
import FeaturesPage from "./features/landing/pages/FeaturesPage";
import HowItWorksPage from "./features/landing/pages/HowItWorksPage";
import AboutPage from "./features/landing/pages/AboutPage";
import FaqPage from "./features/landing/pages/FaqPage";
import ContactPage from "./features/landing/pages/ContactPage";
import NotFoundPage from "./features/landing/pages/NotFoundPage";
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
import { useLiveAuth } from "./auth/useLiveAuth.ts";
import { LiveProfilePage } from "./features/profile/LiveProfilePage.tsx";


function ProtectedLayout() {
  return (
    <RequireAuth>
      <OnboardingGate completed>
        <DashboardLayout />
      </OnboardingGate>
    </RequireAuth>
  );
}

function OnboardingGate({ completed, children }: { completed: boolean; children: React.ReactNode }) {
  const auth = useLiveAuth();
  if (DATA_MODE === "mock") return <>{children}</>;
  if (Boolean(auth.user?.onboarding_completed) !== completed) {
    return <Navigate to={completed ? "/onboarding" : "/dashboard"} replace />;
  }
  return <>{children}</>;
}

function ProtectedOnboarding() {
  return (
    <RequireAuth>
      <OnboardingGate completed={false}><Onboarding /></OnboardingGate>
    </RequireAuth>
  );
}

function ProtectedOnboardingComplete() {
  return (
    <RequireAuth>
      <OnboardingGate completed><OnboardingComplete /></OnboardingGate>
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
  {
    element: <MarketingLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/features", element: <FeaturesPage /> },
      { path: "/how-it-works", element: <HowItWorksPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/faq", element: <FaqPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "/login", element: <Login /> },
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
      { path: "/settings", element: DATA_MODE === "live" ? <LiveProfilePage /> : <ProfilePage /> },
    ],
  },
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
