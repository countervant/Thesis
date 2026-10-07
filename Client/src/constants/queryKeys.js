const serializeParams = (params) => {
  if (!params) return "all";
  if (typeof params === "string") return params;
  return JSON.stringify(params);
};

export const QUERY_KEYS = {
  // Tasks
  tasks: (params) => ["tasks", serializeParams(params)],
  taskDetails: (id) => ["tasks", "detail", String(id || "")],

  // Team & Clients
  employees: (params) => ["employees", serializeParams(params)],
  clients: (params) => ["clients", serializeParams(params)],
  assignees: () => ["assignees"],
  onlineTeam: () => ["online-team"],

  // Budgets & Planner
  budget: (type = "admin", params) => [
    "budget",
    type,
    serializeParams(params),
  ],

  // Calendar
  calendar: (params) => ["calendar", serializeParams(params)],
  calendarDepartments: () => ["calendar", "departments"],

  // Leave Requests
  leaveRequests: (params) => ["leave-requests", serializeParams(params)],

  // Newsfeed
  newsfeed: (params) => ["newsfeed", serializeParams(params)],

  // Profile & User
  profile: () => ["profile", "me"],
  publicProfile: (id) => ["profile", "public", String(id || "")],

  // Notifications & Messages
  notifications: () => ["notifications"],
  unreadMessages: () => ["messages", "unread"],

  // Dashboards
  adminDashboard: () => ["admin-dashboard"],
  clientDashboard: (params) => ["client-dashboard", serializeParams(params)],

  // Modal / Operations
  allocationPreview: (projectId, payload) => [
    "allocation",
    "preview",
    String(projectId || "global"),
    serializeParams(payload),
  ],
  chatExtractPreview: (conversationId) => [
    "chat",
    "extract-preview",
    String(conversationId || ""),
  ],
  taskPayments: (taskId) => [
    "payments",
    String(taskId || ""),
  ],
};
