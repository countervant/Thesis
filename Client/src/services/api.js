import axios from "axios";
import clientraWatermarkLogo from "../assets/CLIENTRA2.png";

// Same-origin by default. Vite proxies /api to Express in development, while the
// production Express server already serves both the client and API together.
const API_URL = import.meta.env.VITE_API_URL || "/api";
const API_DEBUG = import.meta.env.DEV && import.meta.env.VITE_API_DEBUG === "true";
const isLocalBrowser =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const twoFactorApiCandidates = [
  API_URL,
  ...(isLocalBrowser
    ? ["/api", "http://127.0.0.1:5000/api", "http://localhost:5000/api"]
    : []),
].filter((value, index, values) => values.indexOf(value) === index);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const publicAuthPaths = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/verify-2fa",
  "/auth/resend-2fa",
  "/auth/forgot-password",
  "/auth/reset-password",
]);

const isPublicRequest = (url = "") => publicAuthPaths.has(String(url).split("?")[0]);

if (API_DEBUG) console.info(`[api] Base URL: ${API_URL}`);

const cache = new Map();
const CACHE_TIME = 2 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const MAX_GET_RETRIES = 1;
const RETRY_DELAY_MS = 750;
const wait = (milliseconds) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

const setCacheEntry = (key, value) => {
  cache.delete(key);
  cache.set(key, value);

  while (cache.size > MAX_CACHE_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
};

const cachedGet = async (url) => {
  const cached = cache.get(url);
  const now = Date.now();

  if (cached?.promise) {
    if (API_DEBUG) console.debug(`[api] GET ${url} using in-flight request`);
    return cached.promise;
  }

  if (cached?.data !== undefined && now - cached.time < CACHE_TIME) {
    if (API_DEBUG) console.debug(`[api] GET ${url} served from cache`);
    setCacheEntry(url, cached);
    return cached.data;
  }

  const requestEntry = { promise: null, time: now };
  const promise = api
    .get(url)
    .then((response) => {
      const dataShape = Array.isArray(response.data)
        ? `array(${response.data.length})`
        : typeof response.data;
      if (API_DEBUG) console.debug(`[api] GET ${url} cached ${dataShape}`);
      // A mutation may invalidate this request while it is in flight, and a
      // newer GET may already own the same key. Only the current owner may
      // populate the cache so an older response cannot restore stale data.
      if (cache.get(url) === requestEntry) {
        setCacheEntry(url, {
          data: response.data,
          time: Date.now(),
        });
      }
      return response.data;
    })
    .catch((error) => {
      // Do not let a failed older request delete a newer in-flight/data entry.
      if (cache.get(url) === requestEntry) {
        cache.delete(url);
      }
      throw error;
    });

  requestEntry.promise = promise;
  setCacheEntry(url, requestEntry);
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

const twoFactorRequest = async ({ method = "get", url, data }) => {
  let lastError;

  for (const baseURL of twoFactorApiCandidates) {
    try {
      const response = await api.request({ method, url, data, baseURL });
      const isHtmlFallback =
        typeof response.data === "string" &&
        /<!doctype html|<html/i.test(response.data);

      if (isHtmlFallback) {
        lastError = new Error(`The API route was not available at ${baseURL}.`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      // A real JSON response means Express was reached. Preserve validation,
      // cooldown, password, and SMTP errors instead of trying another server.
      if (serverMessage || (status && status !== 404)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("CLIENTRA API is unavailable.");
};

const asArray = (data, label) => {
  if (Array.isArray(data)) {
    return data;
  }

  const collectionKeys = [
    "data",
    "items",
    "tasks",
    "employees",
    "clients",
    "budgets",
    "posts",
    "users",
    "threads",
    "messages",
    "leaveRequests",
  ];

  for (const key of collectionKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
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

const MAX_PROJECT_OUTPUT_FILE_BYTES = 10 * 1024 * 1024;
const PROJECT_OUTPUT_MIME_TYPES = new Set([
  "application/msword",
  "application/pdf",
  "application/rtf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
]);
const AUTO_WATERMARK_IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const getFileMimeType = (file) => String(file?.type || "")
  .split(";", 1)[0]
  .trim()
  .toLowerCase();

export const PROJECT_OUTPUT_FILE_ACCEPT = [...PROJECT_OUTPUT_MIME_TYPES].join(",");

export const getProjectOutputFileError = (file, label) => {
  if (!file) return `${label} is required.`;
  if (file.size > MAX_PROJECT_OUTPUT_FILE_BYTES) return `${label} must be 10MB or less.`;
  if (!PROJECT_OUTPUT_MIME_TYPES.has(getFileMimeType(file))) {
    return `${label} type is not supported. Use a PDF, Office, image, audio, text, or CSV file.`;
  }
  return "";
};

export const isAutoWatermarkImage = (file) =>
  AUTO_WATERMARK_IMAGE_MIME_TYPES.has(getFileMimeType(file));

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

let watermarkLogoPromise;
const loadWatermarkLogo = () => {
  watermarkLogoPromise ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load the Clientra watermark logo"));
    image.src = clientraWatermarkLogo;
  });
  return watermarkLogoPromise;
};

const createWatermarkedImage = async (file) => {
  if (!isAutoWatermarkImage(file)) return null;

  const bitmap = await createImageBitmap(file);
  const watermarkLogo = await loadWatermarkLogo();
  const maxDimension = 2400;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const fontSize = Math.max(18, Math.round(Math.min(canvas.width, canvas.height) / 18));
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(-Math.PI / 5);
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(199, 47, 178, 0.38)";
  context.strokeStyle = "rgba(255, 255, 255, 0.82)";
  context.lineWidth = Math.max(2, fontSize / 18);
  const logoSize = fontSize * 1.35;
  const logoGap = fontSize * 0.32;
  const wordWidth = context.measureText("CLIENTRA").width;
  const groupWidth = logoSize + logoGap + wordWidth;
  const spacingX = groupWidth + fontSize * 2.4;
  const spacingY = logoSize + fontSize * 1.8;

  for (let y = -canvas.height * 1.2; y <= canvas.height * 1.2; y += spacingY) {
    for (let x = -canvas.width * 1.2; x <= canvas.width * 1.2; x += spacingX) {
      const groupStart = x - groupWidth / 2;
      context.globalAlpha = 0.42;
      context.drawImage(watermarkLogo, groupStart, y - logoSize / 2, logoSize, logoSize);
      context.globalAlpha = 1;
      const wordX = groupStart + logoSize + logoGap;
      context.strokeText("CLIENTRA", wordX, y);
      context.fillText("CLIENTRA", wordX, y);
    }
  }
  context.restore();

  return {
    fileName: `${String(file.name || "output").replace(/\.[^.]+$/, "")}-watermarked.jpg`,
    dataUrl: canvas.toDataURL("image/jpeg", 0.86),
  };
};

const dataUrlToBlob = (dataUrl) => {
  const [header, encoded] = String(dataUrl).split(",");
  const mimeType = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(encoded || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};

const watermarkDownloadedImage = async (blob, fileName) => {
  if (!blob?.type?.startsWith("image/")) return blob;
  const sourceFile = new File([blob], fileName || "output-image", { type: blob.type });
  const watermarked = await createWatermarkedImage(sourceFile);
  return watermarked?.dataUrl ? dataUrlToBlob(watermarked.dataUrl) : blob;
};

const isSafePreviewMimeType = (mimeType) => {
  const normalizedMimeType = String(mimeType || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();

  return [
    "application/pdf",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
  ].includes(normalizedMimeType) ||
    normalizedMimeType.startsWith("audio/") ||
    normalizedMimeType.startsWith("video/");
};

const downloadTaskFile = async (endpoint, fileName, options = {}) => {
  const response = await api.get(endpoint, { responseType: "blob", timeout: 0 });
  const outputBlob = options.watermark 
    ? await watermarkDownloadedImage(response.data, fileName)
    : response.data;
  const url = URL.createObjectURL(outputBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const viewTaskFile = async (endpoint, fileName, options = {}) => {
  const previewWindow = window.open("", "_blank");
  if (previewWindow) previewWindow.opener = null;
  let response;
  try {
    response = await api.get(endpoint, { responseType: "blob", timeout: 0 });
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
  const outputBlob = options.watermark
    ? await watermarkDownloadedImage(response.data, fileName)
    : response.data;
  const url = URL.createObjectURL(outputBlob);

  if (!isSafePreviewMimeType(outputBlob.type)) {
    previewWindow?.close();
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  if (previewWindow) previewWindow.location.href = url;
  else window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const mergeCachedPost = (currentPost, nextPost) => ({
  ...currentPost,
  ...nextPost,
  media: {
    ...(currentPost?.media || {}),
    ...(nextPost?.media || {}),
  },
});

const updateCachedPost = (postId, updater) => {
  Array.from(cache.entries()).forEach(([url, cached]) => {
    if (url !== "/newsfeed" && !url.startsWith("/newsfeed?") && !url.startsWith("/newsfeed/activity")) {
      return;
    }

    const posts = Array.isArray(cached?.data) ? cached.data : cached?.data?.posts;
    if (!Array.isArray(posts)) return;

    const updatedPosts = posts.map((post) =>
      getEntityId(post) === postId ? updater(post) : post
    );
    setCacheEntry(url, {
      data: Array.isArray(cached.data)
        ? updatedPosts
        : { ...cached.data, posts: updatedPosts },
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
  Array.from(cache.entries()).forEach(([url, cached]) => {
    if (url !== "/newsfeed" && !url.startsWith("/newsfeed?") && !url.startsWith("/newsfeed/activity")) {
      return;
    }

    const posts = Array.isArray(cached?.data) ? cached.data : cached?.data?.posts;
    if (!Array.isArray(posts)) return;

    const remainingPosts = posts.filter((post) => getEntityId(post) !== postId);
    setCacheEntry(url, {
      data: Array.isArray(cached.data)
        ? remainingPosts
        : { ...cached.data, posts: remainingPosts },
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
    const token = sessionStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isPublicRequest(config.url)) {
      const error = new Error("Authentication is required for this request.");
      error.code = "ERR_AUTH_REQUIRED";
      error.config = config;
      return Promise.reject(error);
    }
    if (API_DEBUG) {
      console.debug(
        `[api] -> ${config.method?.toUpperCase() || "GET"} ${config.baseURL || ""}${config.url || ""}`
      );
    }
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
    if (API_DEBUG) {
      console.debug(
        `[api] <- ${response.status} ${response.config?.url || ""} (${dataShape})`
      );
    }
    return response;
  },
  async (error) => {
    // A component can finish an interval/effect while logout or session expiry is
    // unmounting the protected UI. Do not send or retry those tokenless requests.
    if (error.code === "ERR_AUTH_REQUIRED") {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const requestUrl = error.config?.url || "";
    const requestConfig = error.config || {};
    const retryCount = Number(requestConfig.__retryCount || 0);
    const isTransientFailure =
      error.code !== "ERR_CANCELED" &&
      (
        !status ||
        [408, 429, 502, 503, 504].includes(status) ||
        ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"].includes(error.code)
      );

    if (
      String(requestConfig.method || "get").toLowerCase() === "get" &&
      isTransientFailure &&
      retryCount < MAX_GET_RETRIES
    ) {
      requestConfig.__retryCount = retryCount + 1;
      console.warn(`[api] Retrying GET ${requestUrl} after a transient failure`);
      await wait(RETRY_DELAY_MS * (retryCount + 1));
      return api.request(requestConfig);
    }

    const isLoginRequest =
      requestUrl.includes("/login") ||
      requestUrl.includes("/verify-2fa") ||
      requestUrl.includes("/resend-2fa") ||
      requestUrl.includes("/enable-2fa") ||
      requestUrl.includes("/disable-2fa");
    console.error("[api] Request failed", {
      method: error.config?.method?.toUpperCase(),
      url: requestUrl,
      status,
      message: error.response?.data?.message || error.message,
    });
    if (status === 401 && !isLoginRequest) {
      // Token expired or invalid - clear storage
      cache.clear();
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
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

  getPublicProfile: async (id, { refresh = false } = {}) => {
    const url = `/auth/users/${id}`;
    if (refresh) cache.delete(url);
    return cachedGet(url);
  },

  getOnlineTeam: async () => {
    const response = await api.get("/auth/online-team");
    return asArray(response.data, "online team");
  },

  updatePresence: async (isOnline = true, authToken = sessionStorage.getItem("token")) => {
    if (!authToken) return null;

    const response = await api.patch(
      "/auth/presence",
      { isOnline },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    clearCache("/auth/me", "/auth/online-team");
    return response.data;
  },

  updateOnlineStatusVisibility: async (showOnlineStatus) => {
    const response = await api.patch("/auth/presence", {
      isOnline: showOnlineStatus,
      showOnlineStatus,
    });
    clearCache("/auth/me", "/auth/online-team", "/messages/users", "/messages/threads");
    return response.data;
  },

  markOfflineOnPageHide: (authToken = sessionStorage.getItem("token")) => {
    if (!authToken || typeof fetch !== "function") return;

    fetch(`${API_URL}/auth/presence`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isOnline: false }),
      keepalive: true,
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.debug("Unable to report offline presence during page unload:", error);
      }
    });
  },

  updateMe: async (profile) => {
    const response = await api.put("/auth/me", profile);
    clearCache("/auth/me", "/auth/users", "/auth/employees", "/auth/assignees", "/clients", "/dashboard", "/newsfeed");
    return response.data;
  },

  deactivateMe: async (currentPassword) => {
    const response = await api.patch("/auth/me/deactivate", { currentPassword });
    cache.clear();
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

  verifyTwoFactor: async (temporaryToken, code) => {
    const response = await twoFactorRequest({ method: "post", url: "/auth/verify-2fa", data: { temporaryToken, code } });
    clearCache("/auth/me");
    return response.data;
  },

  verifyTwoFactorBackupCode: async (temporaryToken, backupCode) => {
    const response = await twoFactorRequest({
      method: "post",
      url: "/auth/verify-2fa",
      data: { temporaryToken, backupCode },
    });
    clearCache("/auth/me", "/auth/2fa-status");
    return response.data;
  },

  resendTwoFactor: async (temporaryToken) => {
    const response = await twoFactorRequest({ method: "post", url: "/auth/resend-2fa", data: { temporaryToken } });
    return response.data;
  },

  getTwoFactorStatus: async () => {
    const response = await twoFactorRequest({ url: "/auth/2fa-status" });
    return response.data;
  },

  requestEnableTwoFactor: async (password) => {
    const response = await twoFactorRequest({ method: "post", url: "/auth/enable-2fa/request", data: { password } });
    return response.data;
  },

  verifyEnableTwoFactor: async (code) => {
    const response = await twoFactorRequest({ method: "post", url: "/auth/enable-2fa/verify", data: { code } });
    if (response.data?.token) {
      sessionStorage.setItem("token", response.data.token);
    }
    clearCache("/auth/me", "/auth/2fa-status");
    return response.data;
  },

  disableTwoFactor: async (password) => {
    const response = await twoFactorRequest({ method: "post", url: "/auth/disable-2fa", data: { password } });
    clearCache("/auth/me", "/auth/2fa-status");
    return response.data;
  },

  regenerateBackupCodes: async () => {
    const response = await api.post("/auth/backup-codes/regenerate");
    clearCache("/auth/2fa-status");
    return response.data;
  },

  getAssignees: async () => {
    return asArray(await cachedGet("/auth/assignees"), "assignees");
  },
};

export const taskAPI = {
  getAll: async (params = "") => {
    let query = params;
    let refresh = false;
    if (typeof params !== "string") {
      const { refresh: shouldRefresh = false, ...queryParams } = params;
      refresh = shouldRefresh;
      query = new URLSearchParams(queryParams).toString();
    }
    const url = `/tasks${query ? `?${query}` : ""}`;
    if (refresh) cache.delete(url);
    return asArray(await cachedGet(url), "tasks");
  },

  getById: async (id, options = {}) => {
    const url = `/tasks/${id}`;
    if (options.refresh) cache.delete(url);
    return cachedGet(url);
  },

  create: async (task) => {
    const response = await api.post("/tasks", task);
    clearCache("/tasks", "/budgets", "/dashboard");
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

  startRevision: async (id) => {
    const response = await api.post(`/tasks/${id}/revisions/start`);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  approve: async (id) => {
    const response = await api.post(`/tasks/${id}/approve`);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  markPaid: async (id) => {
    const response = await api.post(`/tasks/${id}/mark-paid`);
    clearCache("/tasks", "/budgets", "/dashboard");
    return response.data;
  },

  payEmployee: async (id, payment) => {
    const response = await api.post(`/tasks/${id}/pay-employee`, payment);
    clearCache("/tasks", "/budgets", "/budget-planner", "/dashboard");
    return response.data;
  },

  setNewsfeedPermission: async (id, allowed) => {
    const response = await api.patch(`/tasks/${id}/newsfeed-permission`, { allowed });
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  submitFeedback: async (id, feedback) => {
    const response = await api.post(`/tasks/${id}/feedback`, feedback);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  deleteFeedback: async (id) => {
    const response = await api.delete(`/tasks/${id}/feedback`);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  setArchived: async (id, archived) => {
    const response = await api.patch(`/tasks/${id}/archive`, { archived });
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  replyToFeedback: async (id, message) => {
    const response = await api.post(`/tasks/${id}/feedback/reply`, { message });
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  downloadOutput: async (id, fileName = "task-output", options = {}) => {
    return downloadTaskFile(`/tasks/${id}/output/download`, fileName, options);
  },

  viewOutput: async (id, fileName = "task-output", options = {}) => {
    return viewTaskFile(`/tasks/${id}/output/download`, fileName, options);
  },

  downloadAttachment: async (id, attachmentIndex, fileName = "task-attachment") => {
    return downloadTaskFile(`/tasks/${id}/attachments/${attachmentIndex}/download`, fileName);
  },

  viewAttachment: async (id, attachmentIndex, fileName = "task-attachment") => {
    return viewTaskFile(`/tasks/${id}/attachments/${attachmentIndex}/download`, fileName);
  },
  submitOutput: async (id, output) => {
    const [filePayload, watermarkedFilePayload] = await Promise.all([
      output.file
        ? fileToDataUrl(output.file).then((dataUrl) => ({
            fileName: output.file.name,
            dataUrl,
          }))
        : undefined,
      output.watermarkedFile
        ? fileToDataUrl(output.watermarkedFile).then((dataUrl) => ({
            fileName: output.watermarkedFile.name,
            dataUrl,
          }))
        : undefined,
    ]);
    const response = await api.post(`/tasks/${id}/submit-output`, {
      file: filePayload,
      watermarkedFile: watermarkedFilePayload,
      link: output.link,
      message: output.message,
      outputMethod: output.outputMethod,
      subtasks: output.subtasks,
      finalize: output.finalize,
    }, { timeout: 120000 });
    clearCache("/tasks", "/dashboard");
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    clearCache("/tasks", "/dashboard");
    return response.data;
  },
};

const getNewsfeedQuery = (params = "") => {
  if (typeof params === "string") {
    return { query: params.replace(/^\?/, ""), refresh: false };
  }

  const { refresh = false, ...queryParams } = params || {};
  const query = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });

  return {
    query: query.toString(),
    refresh: Boolean(refresh),
  };
};

const normalizeNewsfeedPage = (data) => {
  const posts = asArray(data, "newsfeed posts");

  if (Array.isArray(data)) {
    return {
      posts,
      page: 1,
      limit: posts.length,
      total: posts.length,
      totalPages: 1,
    };
  }

  return {
    ...(data || {}),
    posts,
    page: Math.max(Number(data?.page) || 1, 1),
    limit: Math.max(Number(data?.limit) || posts.length || 1, 1),
    total: Math.max(Number(data?.total) || 0, 0),
    totalPages: Math.max(Number(data?.totalPages) || 1, 1),
  };
};

export const newsfeedAPI = {
  getById: async (id, options = {}) => {
    const url = `/newsfeed/post/${id}`;
    if (options.refresh) cache.delete(url);
    return cachedGet(url);
  },

  getPage: async (params = "") => {
    const { query, refresh } = getNewsfeedQuery(params);
    const url = `/newsfeed${query ? `?${query}` : ""}`;
    if (refresh) cache.delete(url);
    return normalizeNewsfeedPage(await cachedGet(url));
  },

  getAll: async (params = "") => {
    const page = await newsfeedAPI.getPage(params);
    return page.posts;
  },

  getByAuthor: async (author, params = "") => {
    if (typeof params === "string") {
      const query = new URLSearchParams(params.replace(/^\?/, ""));
      query.set("author", author);
      return newsfeedAPI.getAll(query.toString());
    }

    return newsfeedAPI.getAll({ ...(params || {}), author });
  },

  updateCachedPost,

  clearCachedPosts: () => {
    clearCache("/newsfeed", "/newsfeed/activity");
  },

  getActivity: async (params = "") => {
    let query = params;
    let refresh = false;
    if (typeof params !== "string") {
      const { refresh: shouldRefresh = false, ...queryParams } = params;
      refresh = shouldRefresh;
      query = new URLSearchParams(queryParams).toString();
    }
    const url = `/newsfeed/activity${query ? `?${query}` : ""}`;
    if (refresh) cache.delete(url);
    return asArray(await cachedGet(url), "newsfeed activity");
  },

  getMedia: async (id) => {
    return cachedGet(`/newsfeed/${id}/media`);
  },

  getMediaBatch: async (postIds) => {
    const ids = [...new Set((Array.isArray(postIds) ? postIds : []).map(String).filter(Boolean))];
    const mediaById = {};
    const missingIds = [];
    const now = Date.now();

    ids.forEach((id) => {
      const cached = cache.get(`/newsfeed/${id}/media`);
      if (cached?.data !== undefined && now - cached.time < CACHE_TIME) {
        mediaById[id] = cached.data;
      } else {
        missingIds.push(id);
      }
    });

    let failedBatchCount = 0;
    for (let index = 0; index < missingIds.length; index += 3) {
      const batch = missingIds.slice(index, index + 3);
      try {
        const response = await api.post("/newsfeed/media/batch", { ids: batch });
        Object.entries(response.data?.mediaById || {}).forEach(([id, media]) => {
          mediaById[id] = media;
          setCacheEntry(`/newsfeed/${id}/media`, { data: media, time: Date.now() });
        });
      } catch {
        failedBatchCount += 1;
      }
    }

    return { mediaById, failedBatchCount };
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

  getUsersFresh: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    const response = await api.get(`/messages/users${query ? `?${query}` : ""}`);
    return asArray(response.data, "message users");
  },

  getThreadsFresh: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    const response = await api.get(`/messages/threads${query ? `?${query}` : ""}`);
    return asArray(response.data, "message threads");
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

  subscribe: ({ onMessage, onOpen, onError } = {}) => {
    const token = sessionStorage.getItem("token");
    if (!token || typeof EventSource === "undefined") {
      onError?.("Realtime messaging is unavailable.");
      return () => {};
    }

    let events = null;
    let reconnectTimer = null;
    let reconnectDelay = 1000;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped || reconnectTimer) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    };

    const connect = async () => {
      try {
        const response = await api.post("/messages/events-ticket");
        if (stopped) return;

        const ticket = response.data?.ticket;
        if (!ticket) throw new Error("Realtime ticket was not returned");

        const source = new EventSource(
          `${API_URL}/messages/events?token=${encodeURIComponent(ticket)}`
        );
        events = source;

        source.addEventListener("open", () => {
          if (stopped || events !== source) return;
          reconnectDelay = 1000;
          onOpen?.();
        });

        source.addEventListener("message", (event) => {
          if (stopped || events !== source) return;
          try {
            clearCache("/messages/threads");
            onMessage?.(JSON.parse(event.data));
          } catch {
            onError?.("Unable to receive realtime message.");
          }
        });

        source.addEventListener("error", () => {
          if (stopped || events !== source) return;
          source.close();
          events = null;
          onError?.("Realtime connection interrupted.");
          scheduleReconnect();
        });
      } catch (error) {
        if (stopped) return;
        onError?.(
          error.response?.data?.message || "Realtime messaging is unavailable."
        );
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      events?.close();
      events = null;
    };
  },
};

export const employeeAPI = {
  getAll: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    return asArray(await cachedGet(`/auth/employees${query ? `?${query}` : ""}`), "employees");
  },

  getAllFresh: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    const response = await api.get(`/auth/employees${query ? `?${query}` : ""}`);
    return asArray(response.data, "employees");
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

  getAllFresh: async (params = "") => {
    const query = typeof params === "string" ? params : new URLSearchParams(params).toString();
    const response = await api.get(`/clients${query ? `?${query}` : ""}`);
    return asArray(response.data, "clients");
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

const getBudgetQuery = (params = "") => {
  if (typeof params === "string") {
    return { query: params.replace(/^\?/, ""), refresh: false };
  }

  if (params instanceof URLSearchParams) {
    return { query: params.toString(), refresh: false };
  }

  const { refresh = false, ...queryParams } = params || {};
  const query = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.set(key, String(value));
    }
  });

  return { query: query.toString(), refresh: Boolean(refresh) };
};

const normalizeBudgetPage = (data) => {
  const budgets = asArray(data, "budget entries");

  if (Array.isArray(data)) {
    return {
      budgets,
      page: 1,
      limit: budgets.length,
      total: budgets.length,
      totalPages: 1,
    };
  }

  return {
    ...(data || {}),
    budgets,
    page: Math.max(Number(data?.page) || 1, 1),
    limit: Math.max(Number(data?.limit) || budgets.length || 1, 1),
    total: Math.max(Number(data?.total) || 0, 0),
    totalPages: Math.max(Number(data?.totalPages) || 1, 1),
  };
};

export const budgetAPI = {
  getPage: async (params = "") => {
    const { query, refresh } = getBudgetQuery(params);
    const url = `/budgets${query ? `?${query}` : ""}`;
    if (refresh) cache.delete(url);
    return normalizeBudgetPage(await cachedGet(url));
  },

  getAll: async (params = "") => {
    const page = await budgetAPI.getPage(params);
    return page.budgets;
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

  getAll: async () => {
    const data = await cachedGet("/budget-planner");
    return Array.isArray(data?.entries) ? data.entries : [];
  },

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
      roles: Array.isArray(response?.roles) ? response.roles : [],
      leaveTypes: Array.isArray(response?.leaveTypes) ? response.leaveTypes : [],
      summary: response?.summary || {},
    };
  },

  create: async (leaveRequest) => {
    const response = await api.post("/leave-requests", leaveRequest);
    clearCache("/leave-requests", "/auth/assignees", "/dashboard");
    return response.data;
  },

  updateStatus: async (id, status, comment = "") => {
    const response = await api.patch(`/leave-requests/${id}/status`, { status, comment });
    clearCache("/leave-requests", "/auth/assignees", "/dashboard");
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
