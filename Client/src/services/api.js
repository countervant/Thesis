import axios from "axios";

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const cache = new Map();
const CACHE_TIME = 30 * 1000;

const cachedGet = async (url) => {
  const cached = cache.get(url);
  const now = Date.now();

  if (cached && now - cached.time < CACHE_TIME) {
    return cached.data;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = api
    .get(url)
    .then((response) => {
      cache.set(url, {
        data: response.data,
        time: Date.now(),
      });
      return response.data;
    })
    .catch((error) => {
      cache.delete(url);
      throw error;
    });

  cache.set(url, { promise, time: now });
  return promise;
};

const clearCache = (...urls) => {
  urls.forEach((url) => cache.delete(url));
};

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
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
      cache.clear();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  register: async (firstName, lastName, email, password) => {
    const response = await api.post("/auth/register", {
      firstName,
      lastName,
      email,
      password,
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  updateMe: async (profile) => {
    const response = await api.put("/auth/me", profile);
    clearCache("/auth/me", "/auth/employees", "/auth/assignees", "/clients");
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (email, otp, password) => {
    const response = await api.post("/auth/reset-password", { email, otp, password });
    return response.data;
  },

  getAssignees: async () => {
    return cachedGet("/auth/assignees");
  },
};

export const taskAPI = {
  getAll: async () => {
    return cachedGet("/tasks");
  },

  create: async (task) => {
    const response = await api.post("/tasks", task);
    clearCache("/tasks");
    return response.data;
  },

  update: async (id, task) => {
    const response = await api.put(`/tasks/${id}`, task);
    clearCache("/tasks");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    clearCache("/tasks");
    return response.data;
  },
};

export const employeeAPI = {
  getAll: async () => {
    return cachedGet("/auth/employees");
  },

  create: async (employee) => {
    const response = await api.post("/auth/employees", employee);
    clearCache("/auth/employees", "/auth/assignees");
    return response.data;
  },

  update: async (id, employee) => {
    const response = await api.put(`/auth/employees/${id}`, employee);
    clearCache("/auth/employees", "/auth/assignees", "/clients");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/auth/employees/${id}`);
    clearCache("/auth/employees", "/auth/assignees", "/clients");
    return response.data;
  },
};

export const clientAPI = {
  getAll: async () => {
    return cachedGet("/clients");
  },

  create: async (client) => {
    const response = await api.post("/clients", client);
    clearCache("/clients");
    return response.data;
  },

  update: async (id, client) => {
    const response = await api.put(`/clients/${id}`, client);
    clearCache("/clients");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    clearCache("/clients");
    return response.data;
  },
};

export const budgetAPI = {
  getAll: async () => {
    return cachedGet("/budgets");
  },

  create: async (budget) => {
    const response = await api.post("/budgets", budget);
    clearCache("/budgets");
    return response.data;
  },

  update: async (id, budget) => {
    const response = await api.put(`/budgets/${id}`, budget);
    clearCache("/budgets");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/budgets/${id}`);
    clearCache("/budgets");
    return response.data;
  },
};

export default api;
