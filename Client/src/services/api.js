import axios from "axios";

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
    const response = await api.get("/auth/assignees");
    return response.data;
  },
};

export const taskAPI = {
  getAll: async () => {
    const response = await api.get("/tasks");
    return response.data;
  },

  create: async (task) => {
    const response = await api.post("/tasks", task);
    return response.data;
  },

  update: async (id, task) => {
    const response = await api.put(`/tasks/${id}`, task);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },
};

export const employeeAPI = {
  getAll: async () => {
    const response = await api.get("/auth/employees");
    return response.data;
  },

  create: async (employee) => {
    const response = await api.post("/auth/employees", employee);
    return response.data;
  },

  update: async (id, employee) => {
    const response = await api.put(`/auth/employees/${id}`, employee);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/auth/employees/${id}`);
    return response.data;
  },
};

export const clientAPI = {
  getAll: async () => {
    const response = await api.get("/clients");
    return response.data;
  },

  create: async (client) => {
    const response = await api.post("/clients", client);
    return response.data;
  },

  update: async (id, client) => {
    const response = await api.put(`/clients/${id}`, client);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },
};

export const budgetAPI = {
  getAll: async () => {
    const response = await api.get("/budgets");
    return response.data;
  },

  create: async (budget) => {
    const response = await api.post("/budgets", budget);
    return response.data;
  },

  update: async (id, budget) => {
    const response = await api.put(`/budgets/${id}`, budget);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  },
};

export default api;
