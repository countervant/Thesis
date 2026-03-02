import React, { lazy, Suspense } from "react";
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Outlet,
} from "react-router-dom";

import { AuthProvider } from "../context/AuthContext.jsx";

// Lazy-load page components for code-splitting
const AuthPage = lazy(() => import("../pages/auth/AuthPage.jsx"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword.jsx"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword.jsx"));
const Dashboard = lazy(() => import("../pages/Dashboard.jsx"));
const Unauthorized = lazy(() => import("../pages/auth/Unauthorized.jsx"));

// Eagerly loaded because it wraps every protected route
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

// Shared loading spinner for Suspense boundaries
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500" />
  </div>
);

// Layout component that wraps all routes with AuthProvider
const AuthLayout = () => (
  <AuthProvider>
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  </AuthProvider>
);

// Create router ONCE outside the component so it's stable across re-renders
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AuthLayout />}>
      {/* Login & Register share the same component with a slide transition */}
      <Route index element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin only */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={["Admin"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Employee (Admin + Employee) */}
      <Route
        path="/employee/*"
        element={
          <ProtectedRoute allowedRoles={["Admin", "Employee"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Route>
  )
);

const AppRoutes = () => <RouterProvider router={router} />;

export default AppRoutes;
