import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api.js";

const AuthContext = createContext(null);

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const userForStorage = (userData) => {
  const storedUser = { ...(userData || {}) };
  delete storedUser.password;
  return storedUser;
};

const normalizeUser = (userData, fallbackUser = null) => {
  const source = userData || {};
  const fallback = fallbackUser || {};

  return {
    ...fallback,
    ...source,
    id: source.id || source._id || fallback.id || fallback._id,
    role: normalizeRole(source.role || source.type || fallback.role || fallback.type),
  };
};

const persistUser = (userData) => {
  try {
    localStorage.setItem("user", JSON.stringify(userForStorage(userData)));
  } catch {
    localStorage.removeItem("user");
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  const markOffline = useCallback(async (authToken = token) => {
    if (!authToken) return;

    try {
      await authAPI.updatePresence(false, authToken);
    } catch {
      // Logging out should continue even if the presence request fails.
    }
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        const storedToken = localStorage.getItem("token");

        if (storedToken) {
          setToken(storedToken);
        }

        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            const normalizedUser = normalizeUser(parsedUser);
            setUser(normalizedUser);
            persistUser(normalizedUser);
          } catch {
            localStorage.removeItem("user");
          }
        }

        if (storedToken) {
          try {
            const profile = await authAPI.getMe();
            const normalizedProfile = normalizeUser(profile);
            setUser(normalizedProfile);
            persistUser(normalizedProfile);
          } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const userId = user?.id || user?._id;

  useEffect(() => {
    if (!token || !userId) return undefined;

    let isActive = true;
    const markOnline = () => {
      if (document.visibilityState === "hidden") return;
      authAPI.updatePresence(true).catch(() => {});
    };

    markOnline();
    const intervalId = window.setInterval(() => {
      if (isActive) markOnline();
    }, 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markOnline();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      markOffline(token);
    };
  }, [markOffline, token, userId]);

  const login = (userData, authToken) => {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    setToken(authToken);
    persistUser(normalizedUser);
    localStorage.setItem("token", authToken);
  };

  const logout = async () => {
    const currentToken = token;
    await markOffline(currentToken);
    setUser(null);
    setToken(null);
    authAPI.clearSessionCache();
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    sessionStorage.removeItem("clientraBackLockedAfterLogin");
  };

  const updateUser = useCallback((userData) => {
    setUser((currentUser) => {
      const normalizedUser = normalizeUser(userData, currentUser);

      persistUser(normalizedUser);
      return normalizedUser;
    });
  }, []);

  const isAuthenticated = !!token;

  // Check if user has required role(s)
  const hasRole = (roles) => {
    if (!user) return false;
    const userRole = normalizeRole(user.role);
    if (typeof roles === "string") {
      return userRole === normalizeRole(roles);
    }
    return roles.map(normalizeRole).includes(userRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        isAuthenticated,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
