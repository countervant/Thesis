import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AppLoadingScreen from "../AppLoadingScreen.jsx";

const LoginBackGuard = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    if (sessionStorage.getItem("clientraBackLockedAfterLogin") !== "true") {
      return undefined;
    }

    const lockUrl = `${location.pathname}${location.search}${location.hash}`;
    window.history.replaceState({ clientraBackLock: true }, "", lockUrl);
    window.history.pushState({ clientraBackLock: true }, "", lockUrl);

    const keepCurrentPage = () => {
      window.history.pushState({ clientraBackLock: true }, "", lockUrl);
    };

    window.addEventListener("popstate", keepCurrentPage);
    return () => window.removeEventListener("popstate", keepCurrentPage);
  }, [location.hash, location.pathname, location.search]);

  return children;
};

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

  return <LoginBackGuard>{children}</LoginBackGuard>;
};

export default ProtectedRoute;
