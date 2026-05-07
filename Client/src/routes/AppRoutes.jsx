import React from "react";
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

import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword.jsx";
import ResetPassword from "../pages/auth/ResetPassword.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Profile from "../pages/Profile.jsx";
import PublicProfile from "../pages/PublicProfile.jsx";
import Unauthorized from "../pages/auth/Unauthorized.jsx";
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";
import { AuthProvider, useAuth } from "../context/AuthContext.jsx";

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500" />
      </div>
    );
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
        <Route path="/unauthorized" element={<Unauthorized />} />
        
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

  return <RouterProvider router={router} />;
};

export default AppRoutes;
