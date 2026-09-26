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


function ProtectedLayout() {
  return (
    <RequireAuth>
      <DashboardLayout />
    </RequireAuth>
  );
}

function ProtectedOnboarding() {
  return (
    <RequireAuth>
      <Onboarding />
    </RequireAuth>
  );
}

function ProtectedOnboardingComplete() {
  return (
    <RequireAuth>
      <OnboardingComplete />
    </RequireAuth>
  );
}

/** Signup verification screen — requires the session created during signup. */
function ProtectedOtp() {
  return (
    <RequireAuth>
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
  return (
    <>
      <RouterProvider router={router} />
      <ToastHost />
    </>
  );
}

export default App;
