import React, { lazy, Suspense } from "react";
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Outlet,
  Navigate,
  Link,
  useRouteError,
} from "react-router-dom";

import TwoFactorVerification from "../components/auth/TwoFactorVerification.jsx";
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";
import AppLoadingScreen from "../components/AppLoadingScreen.jsx";
import { AuthProvider, useAuth } from "../context/AuthContext.jsx";

const Login = lazy(() => import("../pages/auth/Login.jsx"));
const Register = lazy(() => import("../pages/auth/Register.jsx"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword.jsx"));
const Dashboard = lazy(() => import("../pages/Dashboard.jsx"));
const Profile = lazy(() => import("../pages/Profile.jsx"));
const PublicProfile = lazy(() => import("../pages/PublicProfile.jsx"));
const Unauthorized = lazy(() => import("../pages/auth/Unauthorized.jsx"));
const TwoFactorSetup = lazy(() => import("../pages/auth/TwoFactorSetup.jsx"));

const dashboardPathByRole = {
  client: "/client/dashboard",
  employee: "/employee/dashboard",
  admin: "/admin/dashboard",
};

// Layout component that wraps all routes with AuthProvider
const AuthLayout = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

const RoleDashboardRedirect = () => {
  const { user } = useAuth();
  return <Navigate to={dashboardPathByRole[user?.role] || "/client/dashboard"} replace />;
};

const AuthPageRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <AppLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={dashboardPathByRole[user?.role] || "/client/dashboard"} replace />;
  }

  return children;
};

const RouteErrorBoundary = () => {
  const error = useRouteError();
  const message =
    error?.statusText ||
    error?.message ||
    "Something went wrong while loading this page.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-300">
          Application Error
        </p>
        <h1 className="mt-3 text-2xl font-semibold">This page hit a problem.</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-300">{message}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 rounded-md bg-[#dc4fb2] px-4 text-sm font-semibold text-white transition hover:brightness-105"
          >
            Reload
          </button>
          <Link
            to="/dashboard"
            className="flex h-10 items-center rounded-md border border-white/15 px-4 text-sm font-semibold text-neutral-100 transition hover:bg-white/10"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
};

const AppRoutes = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<AuthLayout />} errorElement={<RouteErrorBoundary />}>
        <Route
          index
          element={
            <AuthPageRoute>
              <Login />
            </AuthPageRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthPageRoute>
              <Register />
            </AuthPageRoute>
          }
        />
        <Route
          path="/ForgotPassword"
          element={
            <AuthPageRoute>
              <ForgotPassword />
            </AuthPageRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-2fa" element={<TwoFactorVerification />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route
          path="/setup-2fa"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <TwoFactorSetup />
            </ProtectedRoute>
          }
        />
        
        {/* Protected Routes - requires authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleDashboardRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <PublicProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/client/dashboard"
          element={
            <ProtectedRoute allowedRoles={["client"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Employee routes */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Route>
    )
  );

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};

export default AppRoutes;
