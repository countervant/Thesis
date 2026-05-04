import React from "react";
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
  Outlet,
} from "react-router-dom";

import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword.jsx";
import ResetPassword from "../pages/auth/ResetPassword.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Unauthorized from "../pages/auth/Unauthorized.jsx";
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";

// Layout component that wraps all routes with AuthProvider
const AuthLayout = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

const AppRoutes = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route element={<AuthLayout />}>
        <Route index element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/ForgotPassword" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        
        {/* Protected Routes - requires authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Employee routes - accessible by Admin and Employee */}
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

  return <RouterProvider router={router} />;
};

export default AppRoutes;
