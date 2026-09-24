import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from "./component/Login";
import SignUp from "./component/SignUp";
import { Dashboard } from "./component/Dashboard";
import ForgetPassword from "./component/ForgetPassword";
import ResetPassword from "./component/ResetPassword";

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <Login /> },
  { path: "/signup", element: <SignUp /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/forgetpassword", element: <ForgetPassword /> },
  { path: "/resetpassword", element: <ResetPassword /> },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
