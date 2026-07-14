import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AppLoadingScreen from "../AppLoadingScreen.jsx";

// Protected route component that checks authentication and roles
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, hasRole, loading, token, user } = useAuth();
  const location = useLocation();

  if (loading || (token && !user)) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    // User doesn't have required role - redirect to unauthorized page or dashboard
    return <Navigate to="/unauthorized" replace />;
  }

  if (user?.role === "admin" && user.twoFactorEnabled === false && location.pathname !== "/setup-2fa") {
    return <Navigate to="/setup-2fa" replace />;
  }

  return children;
};

export default ProtectedRoute;
