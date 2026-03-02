import axios from "axios";

// Use Vite env var; in dev the proxy forwards /api to localhost:5000
const API_URL = `${import.meta.env.VITE_API_URL || "/api"}/auth`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000, // 15 s request timeout
});

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.includes("/login");
    if (status === 401 && !isLoginRequest) {
      // Token expired or invalid - clear storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post("/login", { email, password });
    return response.data;
  },

  register: async (email, password, type) => {
    const response = await api.post("/register", { email, password, type });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/me");
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post("/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (email, otp, password) => {
    const response = await api.post("/reset-password", { email, otp, password });
    return response.data;
  },
};

export default api;
