import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api.js";

const AuthContext = createContext(null);

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const userForStorage = (userData) => {
  const storedUser = { ...(userData || {}) };
  delete storedUser.password;
  return storedUser;
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
            const normalizedUser = {
              ...parsedUser,
              role: normalizeRole(parsedUser.role || parsedUser.type),
            };
            setUser(normalizedUser);
            persistUser(normalizedUser);
          } catch {
            localStorage.removeItem("user");
          }
        }

        if (storedToken) {
          try {
            const profile = await authAPI.getMe();
            const normalizedProfile = {
              id: profile._id || profile.id,
              ...profile,
              role: normalizeRole(profile.role || profile.type),
            };
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

  const login = (userData, authToken) => {
    const normalizedUser = {
      ...userData,
      role: normalizeRole(userData.role || userData.type),
    };
    setUser(normalizedUser);
    setToken(authToken);
    persistUser(normalizedUser);
    localStorage.setItem("token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const updateUser = useCallback((userData) => {
    setUser((currentUser) => {
      const normalizedUser = {
        ...currentUser,
        ...userData,
        id: userData.id || userData._id || currentUser?.id,
        role: normalizeRole(userData.role || userData.type || currentUser?.role),
      };

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
