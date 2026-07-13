import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

console.info(`[api] Base URL: ${API_URL}`);

const cache = new Map();
const CACHE_TIME = 2 * 60 * 1000;

const cachedGet = async (url) => {
  const cached = cache.get(url);
  const now = Date.now();

  if (cached?.promise) {
    console.debug(`[api] GET ${url} using in-flight request`);
    return cached.promise;
  }

  if (cached?.data !== undefined && now - cached.time < CACHE_TIME) {
    console.debug(`[api] GET ${url} served from cache`);
    return cached.data;
  }

  const promise = api
    .get(url)
    .then((response) => {
      const dataShape = Array.isArray(response.data)
        ? `array(${response.data.length})`
        : typeof response.data;
      console.debug(`[api] GET ${url} cached ${dataShape}`);
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
  urls.forEach((url) => {
    Array.from(cache.keys()).forEach((key) => {
      if (key === url || key.startsWith(`${url}?`) || key.startsWith(`${url}/`)) {
        cache.delete(key);
      }
    });
  });
};

const asArray = (data, label) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.tasks)) {
    return data.tasks;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  console.warn(`[api] Expected ${label} to be an array, received:`, data);
  return [];
};

export const getApiErrorMessage = (error, fallback = "Unable to load data.") => {
  const status = error.response?.status;
  const method = error.config?.method?.toUpperCase?.() || "GET";
  const url = `${error.config?.baseURL || API_URL}${error.config?.url || ""}`;
  const serverMessage = error.response?.data?.message;
  const networkMessage = error.message;

  if (serverMessage) {
    return `${serverMessage} (${method} ${url}${status ? `, HTTP ${status}` : ""})`;
  }

  if (status) {
    return `${fallback} (${method} ${url}, HTTP ${status})`;
  }

  return `${fallback} (${method} ${url}, ${networkMessage || "network error"})`;
};

const getEntityId = (entity) => entity?._id || entity?.id || entity || "";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const mergeCachedPost = (currentPost, nextPost) => ({
  ...currentPost,
  ...nextPost,
  media: {
    ...(currentPost?.media || {}),
    ...(nextPost?.media || {}),
  },
});

const updateCachedPost = (postId, updater) => {
  ["/newsfeed", "/newsfeed/activity"].forEach((url) => {
    const cached = cache.get(url);

    if (!Array.isArray(cached?.data)) {
      return;
    }

    cache.set(url, {
      data: cached.data.map((post) =>
        getEntityId(post) === postId ? updater(post) : post
      ),
      time: Date.now(),
    });
  });
};

const replaceCachedPost = (updatedPost) => {
  const postId = getEntityId(updatedPost);
  if (!postId) return;

  updateCachedPost(postId, (post) => mergeCachedPost(post, updatedPost));
};

const removeCachedPost = (postId) => {
  ["/newsfeed", "/newsfeed/activity"].forEach((url) => {
    const cached = cache.get(url);

    if (!Array.isArray(cached?.data)) {
      return;
    }

    cache.set(url, {
      data: cached.data.filter((post) => getEntityId(post) !== postId),
      time: Date.now(),
    });
  });
};

const emitNewsfeedUpdate = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clientra:newsfeed-updated"));
  }
};

// Add token to requests automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.debug(
      `[api] -> ${config.method?.toUpperCase() || "GET"} ${config.baseURL || ""}${config.url || ""}`
    );
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    const dataShape = Array.isArray(response.data)
      ? `array(${response.data.length})`
      : typeof response.data;
    console.debug(
      `[api] <- ${response.status} ${response.config?.url || ""} (${dataShape})`
    );
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const isLoginRequest = requestUrl.includes("/login");
    console.error("[api] Request failed", {
      method: error.config?.method?.toUpperCase(),
      url: requestUrl,
      status,
      message: error.response?.data?.message || error.message,
    });
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
  clearSessionCache: () => {
    cache.clear();
  },

  login: async (email, password) => {
    clearCache("/auth/me");
    const response = await api.post("/auth/login", { email, password }, { timeout: 45000 });
    return response.data;
  },

  register: async (
    firstName,
    middleInitial,
    lastName,
    companyName,
    email,
    password,
    phone = "",
    country = ""
  ) => {
    const response = await api.post("/auth/register", {
      firstName,
      middleInitial,
      lastName,
      companyName,
      email,
      password,
      phone,
      country,
    });
    return response.data;
  },

  getMe: async () => {
    return cachedGet("/auth/me");
  },

  getPublicProfile: async (id) => {
    return cachedGet(`/auth/users/${id}`);
  },

  getOnlineTeam: async () => {
    const response = await api.get("/auth/online-team");
    return asArray(response.data, "online team");
  },

  updatePresence: async (isOnline = true, authToken = localStorage.getItem("token")) => {
    if (!authToken) return null;

    const response = await api.patch(
      "/auth/presence",
      { isOnline },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    clearCache("/auth/me", "/auth/online-team");
    return response.data;
  },

  updateMe: async (profile) => {
    const response = await api.put("/auth/me", profile);
    clearCache("/auth/me", "/auth/users", "/auth/employees", "/auth/assignees", "/clients", "/dashboard");
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
    return asArray(await cachedGet("/auth/assignees"), "assignees");
  },
};

export const taskAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/tasks${query ? `?${query}` : ""}`), "tasks");
  },

  create: async (task) => {
    const response = await api.post("/tasks", task);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  update: async (id, task) => {
    const response = await api.put(`/tasks/${id}`, task);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  requestRevision: async (id, revision) => {
    const response = await api.post(`/tasks/${id}/revisions`, revision);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  submitFeedback: async (id, feedback) => {
    const response = await api.post(`/tasks/${id}/feedback`, feedback);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  downloadOutput: async (id, fileName = "task-output") => {
    const response = await api.get(`/tasks/${id}/output/download`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  },

  submitOutput: async (id, output) => {
    const filePayload = output.file
      ? {
          fileName: output.file.name,
          dataUrl: await fileToDataUrl(output.file),
        }
      : undefined;
    const response = await api.post(`/tasks/${id}/submit-output`, {
      file: filePayload,
      link: output.link,
      message: output.message,
      outputMethod: output.outputMethod,
      subtasks: output.subtasks,
    });
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },
};

export const newsfeedAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/newsfeed${query ? `?${query}` : ""}`), "newsfeed posts");
  },

  updateCachedPost,

  clearCachedPosts: () => {
    clearCache("/newsfeed", "/newsfeed/activity");
  },

  getActivity: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/newsfeed/activity${query ? `?${query}` : ""}`), "newsfeed activity");
  },

  getMedia: async (id) => {
    return cachedGet(`/newsfeed/${id}/media`);
  },

  create: async (post) => {
    const response = await api.post("/newsfeed", post);
    clearCache("/newsfeed", "/newsfeed/activity");
    emitNewsfeedUpdate();
    return response.data;
  },

  toggleHeart: async (id) => {
    const response = await api.patch(`/newsfeed/${id}/heart`);
    replaceCachedPost(response.data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/newsfeed/${id}`);
    removeCachedPost(id);
    emitNewsfeedUpdate();
    return response.data;
  },

  comment: async (id, text) => {
    const response = await api.post(`/newsfeed/${id}/comments`, { text });
    replaceCachedPost(response.data);
    emitNewsfeedUpdate();
    return response.data;
  },

  deleteComment: async (postId, commentId) => {
    const response = await api.delete(`/newsfeed/${postId}/comments/${commentId}`);
    replaceCachedPost(response.data);
    emitNewsfeedUpdate();
    return response.data;
  },

  toggleCommentHeart: async (postId, commentId) => {
    const response = await api.patch(
      `/newsfeed/${postId}/comments/${commentId}/heart`
    );
    replaceCachedPost(response.data);
    return response.data;
  },

  reply: async (postId, commentId, text) => {
    const response = await api.post(
      `/newsfeed/${postId}/comments/${commentId}/replies`,
      { text }
    );
    replaceCachedPost(response.data);
    emitNewsfeedUpdate();
    return response.data;
  },
};

export const messageAPI = {
  getUsers: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/messages/users${query ? `?${query}` : ""}`), "message users");
  },

  getThreads: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/messages/threads${query ? `?${query}` : ""}`), "message threads");
  },

  getUnreadCount: async () => {
    const response = await api.get("/messages/unread-count");
    return Number(response.data?.unreadCount) || 0;
  },

  getThread: async (userId) => {
    const response = await api.get(`/messages/threads/${userId}`);
    clearCache("/messages/threads");
    return response.data;
  },

  send: async (recipientId, text) => {
    const payload = Array.isArray(recipientId)
      ? { recipientIds: recipientId, text }
      : { recipientId, text };
    const response = await api.post("/messages", payload);
    clearCache("/messages/threads");
    return response.data;
  },

  update: async (id, text) => {
    const response = await api.put(`/messages/${id}`, { text });
    clearCache("/messages/threads");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/messages/${id}`);
    clearCache("/messages/threads");
    return response.data;
  },

  subscribe: ({ onMessage, onError } = {}) => {
    const token = localStorage.getItem("token");
    if (!token || typeof EventSource === "undefined") {
      return () => {};
    }

    const events = new EventSource(
      `${API_URL}/messages/events?token=${encodeURIComponent(token)}`
    );

    events.addEventListener("message", (event) => {
      try {
        clearCache("/messages/threads");
        onMessage?.(JSON.parse(event.data));
      } catch {
        onError?.("Unable to receive realtime message.");
      }
    });

    events.addEventListener("error", () => {
      onError?.("Realtime connection interrupted.");
    });

    return () => events.close();
  },
};

export const employeeAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/auth/employees${query ? `?${query}` : ""}`), "employees");
  },

  create: async (employee) => {
    const response = await api.post("/auth/employees", employee);
    clearCache("/auth/employees", "/auth/assignees", "/clients", "/dashboard");
    return response.data;
  },

  update: async (id, employee) => {
    const response = await api.put(`/auth/employees/${id}`, employee);
    clearCache("/auth/employees", "/auth/assignees", "/clients", "/dashboard");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/auth/employees/${id}`);
    clearCache("/auth/employees", "/auth/assignees", "/clients", "/dashboard");
    return response.data;
  },
};

export const clientAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/clients${query ? `?${query}` : ""}`), "clients");
  },

  create: async (client) => {
    const response = await api.post("/clients", client);
    clearCache("/clients", "/dashboard");
    return response.data;
  },

  update: async (id, client) => {
    const response = await api.put(`/clients/${id}`, client);
    clearCache("/clients", "/dashboard");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    clearCache("/clients", "/dashboard");
    return response.data;
  },
};

export const budgetAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/budgets${query ? `?${query}` : ""}`), "budget entries");
  },

  create: async (budget) => {
    const response = await api.post("/budgets", budget);
    clearCache("/budgets", "/dashboard");
    return response.data;
  },

  update: async (id, budget) => {
    const response = await api.put(`/budgets/${id}`, budget);
    clearCache("/budgets", "/dashboard");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/budgets/${id}`);
    clearCache("/budgets", "/dashboard");
    return response.data;
  },
};

export const budgetPlannerAPI = {
  get: async () => cachedGet("/budget-planner"),

  create: async (entry) => {
    const response = await api.post("/budget-planner", entry);
    clearCache("/budget-planner");
    return response.data;
  },

  update: async (id, entry) => {
    const response = await api.put(`/budget-planner/${id}`, entry);
    clearCache("/budget-planner");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/budget-planner/${id}`);
    clearCache("/budget-planner");
    return response.data;
  },

  updateSettings: async (monthlyLimit) => {
    const response = await api.put("/budget-planner/settings", { monthlyLimit });
    clearCache("/budget-planner");
    return response.data;
  },
};

export const calendarAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/calendar${query ? `?${query}` : ""}`), "calendar events");
  },

  create: async (event) => {
    const response = await api.post("/calendar", event);
    clearCache("/calendar");
    return response.data;
  },

  update: async (id, event) => {
    const response = await api.put(`/calendar/${id}`, event);
    clearCache("/calendar");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/calendar/${id}`);
    clearCache("/calendar");
    return response.data;
  },

  getDepartments: async () => {
    return asArray(await cachedGet("/calendar/departments"), "calendar departments");
  },

  createDepartment: async (department) => {
    const response = await api.post("/calendar/departments", department);
    clearCache("/calendar/departments");
    return response.data;
  },
};

export const leaveRequestAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    const response = await cachedGet(`/leave-requests${query ? `?${query}` : ""}`);
    return {
      ...response,
      leaveRequests: asArray(response?.leaveRequests || response?.data, "leave requests"),
      departments: Array.isArray(response?.departments) ? response.departments : [],
      leaveTypes: Array.isArray(response?.leaveTypes) ? response.leaveTypes : [],
      summary: response?.summary || {},
    };
  },

  create: async (leaveRequest) => {
    const response = await api.post("/leave-requests", leaveRequest);
    clearCache("/leave-requests", "/dashboard");
    return response.data;
  },

  updateStatus: async (id, status, comment = "") => {
    const response = await api.patch(`/leave-requests/${id}/status`, { status, comment });
    clearCache("/leave-requests", "/dashboard");
    return response.data;
  },

  comment: async (id, text) => {
    const response = await api.post(`/leave-requests/${id}/comments`, { text });
    clearCache("/leave-requests", "/dashboard");
    return response.data;
  },
};

export const dashboardAPI = {
  getSummary: async () => {
    return cachedGet("/dashboard");
  },
};

export default api;
