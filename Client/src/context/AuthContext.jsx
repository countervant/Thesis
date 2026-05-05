import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const normalizeRole = (role) => role?.toLowerCase();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      const normalizedUser = {
        ...parsedUser,
        role: normalizeRole(parsedUser.role || parsedUser.type),
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(normalizedUser);
      setToken(storedToken);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    const normalizedUser = {
      ...userData,
      role: normalizeRole(userData.role || userData.type),
    };
    setUser(normalizedUser);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("token", authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const isAuthenticated = !!token;

  // Check if user has required role(s)
  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === "string") {
      return user.role === roles;
    }
    return roles.includes(user.role);
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
