import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { authAPI } from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const normalizeToken = (rawToken) => {
    const value = typeof rawToken === "string" ? rawToken.trim() : "";
    if (!value || value === "undefined" || value === "null") return null;
    return value;
  };

  const [token, setToken] = useState(() => normalizeToken(localStorage.getItem("token")));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      // Hydrate from localStorage, then validate token with /me.
      const storedToken = normalizeToken(localStorage.getItem("token"));
      const storedUserRaw = localStorage.getItem("user");

      if (!storedToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (isMounted) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) setToken(storedToken);

      if (storedUserRaw) {
        try {
          const parsedUser = JSON.parse(storedUserRaw);
          if (isMounted) setUser(parsedUser);
        } catch {
          localStorage.removeItem("user");
        }
      }

      try {
        const me = await authAPI.getMe();
        if (!isMounted) return;
        setUser(me);
        localStorage.setItem("user", JSON.stringify(me));
      } catch {
        // Token invalid/expired
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    const normalized = normalizeToken(authToken);
    setToken(normalized);
    localStorage.setItem("user", JSON.stringify(userData));
    if (normalized) {
      localStorage.setItem("token", normalized);
    } else {
      localStorage.removeItem("token");
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  // Check if user has required role(s)
  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === "string") {
      return user.type === roles;
    }
    return roles.includes(user.type);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
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
