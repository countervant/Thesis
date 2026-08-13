import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";
import { authAPI } from "../services/api.js";

const AuthContext = createContext(null);
const PRESENCE_HEARTBEAT_MS = 30 * 1000;
const SESSION_USER_FIELDS = [
  "_id",
  "id",
  "firstName",
  "middleInitial",
  "lastName",
  "companyName",
  "email",
  "role",
  "type",
  "position",
  "department",
  "employeeId",
  "employeeID",
  "phone",
  "country",
  "birthday",
  "gender",
  "skillGroups",
  "privacySettings",
  "isActive",
  "isOnline",
  "showOnlineStatus",
  "twoFactorEnabled",
  "twoFactorSetupRequired",
  "createdAt",
  "updatedAt",
  "lastSeen",
];

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const userForStorage = (userData) =>
  SESSION_USER_FIELDS.reduce((storedUser, field) => {
    if (userData?.[field] !== undefined) {
      storedUser[field] = userData[field];
    }
    return storedUser;
  }, {});

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
    sessionStorage.setItem("user", JSON.stringify(userForStorage(userData)));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Unable to persist the authenticated user for this tab:", error);
    }
    sessionStorage.removeItem("user");
  }
};

const readStoredSession = () => {
  const storedToken = sessionStorage.getItem("token");
  const storedUser = sessionStorage.getItem("user");

  if (!storedToken || !storedUser) return { token: null, user: null };

  try {
    return { token: storedToken, user: normalizeUser(JSON.parse(storedUser)) };
  } catch {
    return { token: null, user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [initialSession] = useState(readStoredSession);
  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);
  const [isSessionVerified, setIsSessionVerified] = useState(
    () => !initialSession.token || !initialSession.user
  );
  const sessionRevisionRef = useRef(0);
  const loading = !isSessionVerified;

  useEffect(() => {
    let cancelled = false;
    const sessionRevision = sessionRevisionRef.current;

    // Authentication belongs to this browser tab only. Remove credentials
    // left by older versions that persisted accounts across browser sessions.
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (!initialSession.token || !initialSession.user) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    } else {
      persistUser(initialSession.user);
    }

    if (initialSession.token && initialSession.user) {
      authAPI
        .getMe()
        .then((profile) => {
          if (cancelled || sessionRevisionRef.current !== sessionRevision) return;
          const normalizedProfile = normalizeUser(profile, initialSession.user);
          setUser(normalizedProfile);
          persistUser(normalizedProfile);
          setIsSessionVerified(true);
        })
        .catch((error) => {
          if (cancelled || sessionRevisionRef.current !== sessionRevision) return;
          // The cached tab session remains usable during temporary API outages.
          // Invalid tokens are cleared globally by the API's 401 interceptor.
          const canUseCachedSession =
            !error.response ||
            error.response.status >= 500 ||
            error.response.data?.code === "TWO_FACTOR_SETUP_REQUIRED";

          if (canUseCachedSession) {
            setIsSessionVerified(true);
            return;
          }

          sessionRevisionRef.current += 1;
          authAPI.clearSessionCache();
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setToken(null);
          setUser(null);
          setIsSessionVerified(true);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [initialSession]);

  const userId = user?.id || user?._id;
  const showOnlineStatus = user?.showOnlineStatus !== false;

  useEffect(() => {
    if (!token || !userId) return undefined;

    let isActive = true;
    let presenceRequest = null;
    const syncPresence = () => {
      if (presenceRequest) return presenceRequest;
      const shouldBeOnline =
        showOnlineStatus && document.visibilityState === "visible";
      presenceRequest = authAPI
        .updatePresence(shouldBeOnline, token)
        .catch((error) => {
          if (import.meta.env.DEV) {
            console.debug("Presence update was not delivered:", error);
          }
          return null;
        })
        .finally(() => {
          presenceRequest = null;
        });
      return presenceRequest;
    };

    syncPresence();
    const intervalId = window.setInterval(() => {
      if (isActive && document.visibilityState === "visible") syncPresence();
    }, PRESENCE_HEARTBEAT_MS);

    const handleVisibilityChange = () => syncPresence();
    const handlePageHide = () => authAPI.markOfflineOnPageHide(token);
    const handlePageShow = () => syncPresence();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [showOnlineStatus, token, userId]);

  const login = useCallback((userData, authToken) => {
    const normalizedUser = normalizeUser(userData);
    sessionRevisionRef.current += 1;
    authAPI.clearSessionCache();
    setIsSessionVerified(true);
    setUser(normalizedUser);
    setToken(authToken);
    persistUser(normalizedUser);
    sessionStorage.setItem("token", authToken);
  }, []);

  const logout = useCallback(() => {
    const currentToken = token;
    sessionRevisionRef.current += 1;
    setIsSessionVerified(true);
    setUser(null);
    setToken(null);
    authAPI.clearSessionCache();
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    authAPI.markOfflineOnPageHide(currentToken);
  }, [token]);

  const updateUser = useCallback((userData) => {
    setUser((currentUser) => {
      const normalizedUser = normalizeUser(userData, currentUser);

      persistUser(normalizedUser);
      return normalizedUser;
    });
  }, []);

  // A token by itself is not a usable session. Treat partial/invalid sessions
  // as signed out so route guards cannot remain on the loading screen forever.
  const isAuthenticated = Boolean(token && user);

  // Check if user has required role(s)
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const userRole = normalizeRole(user.role);
    if (typeof roles === "string") {
      return userRole === normalizeRole(roles);
    }
    return roles.map(normalizeRole).includes(userRole);
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated,
    hasRole,
  }), [hasRole, isAuthenticated, loading, login, logout, token, updateUser, user]);

  return (
    <AuthContext.Provider value={contextValue}>
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
