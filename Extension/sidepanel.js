/**
 * CLIENTRA AI Project Generator - Side Panel Script
 */

const API_URL = "https://server1-ndmx.onrender.com";
const APP_URL = "https://clientra.me";

// In-memory application state
let state = {
  apiUrl: API_URL,
  appUrl: APP_URL,
  token: null,
  user: null,
  clients: [],
  currentProposal: null,
  createdProject: null,
  activeTab: null,
};

// DOM Elements
const elements = {
  statusBadge: document.getElementById("statusBadge"),
  statusText: document.getElementById("statusText"),
  toggleSettingsBtn: document.getElementById("toggleSettingsBtn"),
  settingsDrawer: document.getElementById("settingsDrawer"),
  syncTabBtn: document.getElementById("syncTabBtn"),
  loginForm: document.getElementById("loginForm"),
  sessionInfo: document.getElementById("sessionInfo"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  userGreeting: document.getElementById("userGreeting"),
  globalNotice: document.getElementById("globalNotice"),
  globalNoticeText: document.getElementById("globalNoticeText"),
  activeTabTitle: document.getElementById("activeTabTitle"),
  grabSelectionBtn: document.getElementById("grabSelectionBtn"),
  transcriptInput: document.getElementById("transcriptInput"),
  clientHintInput: document.getElementById("clientHintInput"),
  charCount: document.getElementById("charCount"),
  sampleBtn: document.getElementById("sampleBtn"),
  clearBtn: document.getElementById("clearBtn"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  analyzeSpinner: document.getElementById("analyzeSpinner"),
  analyzeBtnText: document.getElementById("analyzeBtnText"),
  analyzingProgress: document.getElementById("analyzingProgress"),
  previewCard: document.getElementById("previewCard"),
  confidenceBadge: document.getElementById("confidenceBadge"),
  projectNameInput: document.getElementById("projectNameInput"),
  clientSelect: document.getElementById("clientSelect"),
  projectSummaryInput: document.getElementById("projectSummaryInput"),
  budgetInput: document.getElementById("budgetInput"),
  downPaymentModeSelect: document.getElementById("downPaymentModeSelect"),
  downPaymentValueRow: document.getElementById("downPaymentValueRow"),
  downPaymentValueLabel: document.getElementById("downPaymentValueLabel"),
  downPaymentValueInput: document.getElementById("downPaymentValueInput"),
  downPaymentPreview: document.getElementById("downPaymentPreview"),
  startDateInput: document.getElementById("startDateInput"),
  deadlineInput: document.getElementById("deadlineInput"),
  taskCount: document.getElementById("taskCount"),
  tasksList: document.getElementById("tasksList"),
  addTaskBtn: document.getElementById("addTaskBtn"),
  commitBtn: document.getElementById("commitBtn"),
  commitSpinner: document.getElementById("commitSpinner"),
  commitBtnText: document.getElementById("commitBtnText"),
  discardBtn: document.getElementById("discardBtn"),
  successCard: document.getElementById("successCard"),
  successDetails: document.getElementById("successDetails"),
  openProjectBtn: document.getElementById("openProjectBtn"),
  extractAnotherBtn: document.getElementById("extractAnotherBtn"),
};

// Initialize side panel
document.addEventListener("DOMContentLoaded", async () => {
  await loadStoredConfig();
  setupEventListeners();
  await refreshActiveTab();
  await checkPendingSelection();
  await verifyAuthentication();
});

/**
 * Load settings and token from chrome.storage
 */
async function loadStoredConfig() {
  const data = await chrome.storage.local.get([
    "token",
    "user",
  ]);

  state.apiUrl = API_URL;
  state.appUrl = APP_URL;
  state.token = data.token || null;
  state.user = data.user || null;

  // Clean up any legacy localhost stored URLs
  await chrome.storage.local.remove(["apiUrl", "appUrl"]);

  updateAuthUI();
}

/**
 * Bind all DOM event listeners
 */
function setupEventListeners() {
  // Settings toggle
  elements.toggleSettingsBtn.addEventListener("click", () => {
    elements.settingsDrawer.classList.toggle("open");
  });

  // Auto-Sync from open clientra.me tab
  elements.syncTabBtn.addEventListener("click", syncWithClientraTab);

  // Login
  elements.loginBtn.addEventListener("click", handleLogin);

  // Logout
  elements.logoutBtn.addEventListener("click", handleLogout);

  // Transcript input changes
  elements.transcriptInput.addEventListener("input", updateCharCount);

  // Grab selection button
  elements.grabSelectionBtn.addEventListener("click", grabSelectionFromTab);

  // Sample and Clear
  if (elements.sampleBtn) {
    elements.sampleBtn.addEventListener("click", () => {
      elements.transcriptInput.value = SAMPLE_TRANSCRIPT;
      elements.clientHintInput.value = "Upwork: Vance Dynamics / Johnathan Vance";
      updateCharCount();
    });
  }

  elements.clearBtn.addEventListener("click", () => {
    elements.transcriptInput.value = "";
    elements.clientHintInput.value = "";
    updateCharCount();
  });

  // Down Payment mode change
  elements.downPaymentModeSelect.addEventListener("change", handleDownPaymentModeChange);
  elements.downPaymentValueInput.addEventListener("input", updateDownPaymentPreview);
  elements.budgetInput.addEventListener("input", updateDownPaymentPreview);

  // Analyze with AI button
  elements.analyzeBtn.addEventListener("click", handleAnalyze);

  // Add Task button
  elements.addTaskBtn.addEventListener("click", handleAddTask);

  // Commit Project button
  elements.commitBtn.addEventListener("click", handleCommit);

  // Discard button
  elements.discardBtn.addEventListener("click", () => {
    elements.previewCard.classList.add("hidden");
    state.currentProposal = null;
  });

  // Open Project in CLIENTRA
  elements.openProjectBtn.addEventListener("click", async () => {
    const targetUrl = `${state.appUrl}/admin/dashboard?page=tasks`;
    try {
      const tabs = await chrome.tabs.query({});
      const clientraTab = tabs.find(
        (t) => t.url && (t.url.includes("clientra.me") || t.url.includes("localhost:5173"))
      );
      if (clientraTab?.id) {
        await chrome.tabs.update(clientraTab.id, { url: targetUrl, active: true });
        if (clientraTab.windowId) {
          await chrome.windows.update(clientraTab.windowId, { focused: true });
        }
        return;
      }
    } catch (e) {
      console.warn("Tab switch error:", e);
    }
    chrome.tabs.create({ url: targetUrl });
  });

  // Extract another project
  elements.extractAnotherBtn.addEventListener("click", () => {
    elements.successCard.classList.add("hidden");
    elements.previewCard.classList.add("hidden");
    elements.transcriptInput.value = "";
    elements.clientHintInput.value = "";
    state.currentProposal = null;
    state.createdProject = null;
    updateCharCount();
  });

  // Listen for selection sent from background service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "SELECTION_RECEIVED" && message.text) {
      elements.transcriptInput.value = message.text;
      if (message.tabTitle) {
        elements.clientHintInput.value = message.tabTitle;
      }
      updateCharCount();
      showNotice("Selection received from webpage!", "info");
    }
  });

  // Update active tab on tab switches
  chrome.tabs.onActivated.addListener(async () => {
    await refreshActiveTab();
  });
}

/**
 * Check if a pending selection was recorded before sidepanel opened
 */
async function checkPendingSelection() {
  const data = await chrome.storage.local.get([
    "pendingTranscript",
    "pendingTabTitle",
    "pendingTimestamp",
  ]);

  if (data.pendingTranscript && Date.now() - (data.pendingTimestamp || 0) < 60000) {
    elements.transcriptInput.value = data.pendingTranscript;
    if (data.pendingTabTitle) {
      elements.clientHintInput.value = data.pendingTabTitle;
    }
    updateCharCount();
    // Clean up
    await chrome.storage.local.remove([
      "pendingTranscript",
      "pendingTabTitle",
      "pendingTimestamp",
    ]);
  }
}

/**
 * Refresh active tab title and context
 */
async function refreshActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      state.activeTab = tab;
      const title = tab.title || tab.url || "Active Webpage";
      elements.activeTabTitle.textContent = title;
      elements.activeTabTitle.title = tab.url || "";
    }
  } catch (err) {
    elements.activeTabTitle.textContent = "External Webpage";
  }
}

/**
 * Grab highlighted text from active tab
 */
async function grabSelectionFromTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      showNotice("No active tab accessible.", "error");
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_SELECTION" });
    if (response?.selection) {
      elements.transcriptInput.value = response.selection;
      if (response.title) {
        elements.clientHintInput.value = response.title;
      }
      updateCharCount();
      showNotice("Selection grabbed successfully!", "info");
    } else {
      showNotice("No text highlighted on page. Highlight text on Upwork, WhatsApp, etc. first.", "warning");
    }
  } catch (err) {
    // If content script was not injected on that tab, run programmatic injection
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection()?.toString() || "",
        });
        const selected = results?.[0]?.result?.trim();
        if (selected) {
          elements.transcriptInput.value = selected;
          elements.clientHintInput.value = tab.title || "";
          updateCharCount();
          showNotice("Selection grabbed!", "info");
          return;
        }
      }
      showNotice("Highlight text on the webpage first, then click Grab Selection.", "warning");
    } catch (e) {
      showNotice("Cannot access this tab. Please paste the chat directly.", "error");
    }
  }
}

/**
 * Auto-Sync authentication with an active CLIENTRA web tab
 */
async function syncWithClientraTab() {
  try {
    // Find open tabs that match CLIENTRA origins
    const tabs = await chrome.tabs.query({});
    const clientraTabs = tabs.filter(
      (t) =>
        t.url &&
        (t.url.includes("localhost:5173") ||
          t.url.includes("localhost:3000") ||
          t.url.includes("clientra.me"))
    );

    if (clientraTabs.length === 0) {
      showNotice("No open clientra.me tab found. Please open clientra.me or log in below.", "warning");
      return;
    }

    let authFound = false;
    for (const tab of clientraTabs) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, { action: "GET_CLIENTRA_AUTH" });
        if (res?.token) {
          const userRole = res.user?.role;
          if (userRole && userRole !== "admin") {
            showNotice(`Access denied: The open CLIENTRA tab is logged in as ${userRole}. Only Administrators can use this extension to create projects.`, "error");
            return;
          }

          // Verify with server that this token has administrator privileges
          const verifyRes = await fetch(`${state.apiUrl}/api/clients?limit=1`, {
            headers: { Authorization: `Bearer ${res.token}` },
          });

          if (verifyRes.status === 403) {
            showNotice("Access denied: Only Administrators can use this extension to create projects.", "error");
            return;
          }
          if (verifyRes.status === 401) {
            showNotice("Session expired on clientra.me tab. Please log in again.", "warning");
            return;
          }

          state.token = res.token;
          state.user = res.user || { role: "admin", email: "admin@clientra.me" };
          state.user.role = "admin";
          await chrome.storage.local.set({ token: state.token, user: state.user });

          authFound = true;
          showNotice("Synced Admin session from clientra.me!", "success");
          updateAuthUI();
          await fetchClients();
          break;
        }
      } catch {}
    }

    if (!authFound) {
      // Try injecting script to read localStorage directly
      for (const tab of clientraTabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
              token: localStorage.getItem("token") || sessionStorage.getItem("token") || "",
              user: localStorage.getItem("user") || sessionStorage.getItem("user") || "",
            }),
          });
          const result = results?.[0]?.result;
          if (result?.token) {
            let parsedUser = null;
            try {
              if (result.user) parsedUser = JSON.parse(result.user);
            } catch {}

            if (parsedUser?.role && parsedUser.role !== "admin") {
              showNotice(`Access denied: The open CLIENTRA tab is logged in as ${parsedUser.role}. Only Administrators can use this extension to create projects.`, "error");
              return;
            }

            // Verify with server that this token has administrator privileges
            const verifyRes = await fetch(`${state.apiUrl}/api/clients?limit=1`, {
              headers: { Authorization: `Bearer ${result.token}` },
            });

            if (verifyRes.status === 403) {
              showNotice("Access denied: Only Administrators can use this extension to create projects.", "error");
              return;
            }
            if (verifyRes.status === 401) {
              showNotice("Session expired on clientra.me tab. Please log in again.", "warning");
              return;
            }

            state.token = result.token;
            state.user = parsedUser || { role: "admin", email: "admin@clientra.me" };
            state.user.role = "admin";
            await chrome.storage.local.set({ token: state.token, user: state.user });
            authFound = true;
            showNotice("Synced Admin session from clientra.me!", "success");
            updateAuthUI();
            await fetchClients();
            break;
          }
        } catch {}
      }
    }

    if (!authFound) {
      showNotice("Could not find logged-in Admin session on clientra.me tab. Please log in on clientra.me or below.", "warning");
    }
  } catch (err) {
    showNotice(`Sync failed: ${err.message}`, "error");
  }
}

/**
 * Handle manual login
 */
async function handleLogin() {
  const email = elements.loginEmail.value.trim();
  const password = elements.loginPassword.value;

  if (!email || !password) {
    showNotice("Please enter both email and password.", "error");
    return;
  }

  elements.loginBtn.disabled = true;
  elements.loginBtn.textContent = "Authenticating Admin...";

  try {
    const res = await fetch(`${state.apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Invalid credentials.");
    }

    if (data.requiresTwoFactor) {
      throw new Error("2-Factor Authentication is active for this account. Please log in on https://clientra.me first, then click '⚡ Auto-Sync from clientra.me Tab'.");
    }

    // Role check: ONLY administrator accounts are authorized to use this extension
    if (data.role !== "admin") {
      throw new Error("Access denied: Only Administrators can log in to this extension because only admins can create projects.");
    }

    state.token = data.token;
    state.user = { id: data.id, email: data.email, role: data.role };
    await chrome.storage.local.set({ token: state.token, user: state.user });

    showNotice("Logged in successfully as Administrator!", "success");
    elements.settingsDrawer.classList.remove("open");
    updateAuthUI();
    await fetchClients();
  } catch (err) {
    showNotice(err.message, "error");
  } finally {
    elements.loginBtn.disabled = false;
    elements.loginBtn.textContent = "Log In as Admin";
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  state.token = null;
  state.user = null;
  await chrome.storage.local.remove(["token", "user"]);
  updateAuthUI();
  showNotice("Disconnected session.", "info");
}

/**
 * Check if the stored token is still valid and has administrator privileges
 */
async function verifyAuthentication() {
  if (!state.token) {
    updateAuthUI();
    return;
  }

  // Pre-check: reject immediately if stored role is not admin
  if (state.user?.role && state.user.role !== "admin") {
    state.token = null;
    state.user = null;
    await chrome.storage.local.remove(["token", "user"]);
    updateAuthUI();
    showNotice("Access denied: Only Administrators can use this extension to create projects.", "warning");
    return;
  }

  try {
    const res = await fetch(`${state.apiUrl}/api/clients?limit=1`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    if (res.status === 401 || res.status === 403) {
      // Token expired or non-admin user
      state.token = null;
      state.user = null;
      await chrome.storage.local.remove(["token", "user"]);
      updateAuthUI();
      if (res.status === 403) {
        showNotice("Access denied: Only Administrators can use this extension to create projects.", "warning");
      }
      return;
    }

    updateAuthUI();
    await fetchClients();
  } catch (err) {
    // Server might be temporarily unreachable
    updateAuthUI(false);
  }
}

/**
 * Update UI according to authentication state
 */
function updateAuthUI(isOnline = true) {
  if (state.token) {
    elements.statusBadge.classList.add("connected");
    elements.statusText.textContent = isOnline ? "Connected (Admin)" : "Server Offline";
    elements.sessionInfo.classList.remove("hidden");
    elements.loginForm.classList.add("hidden");
    elements.userGreeting.textContent = state.user?.email
      ? `Logged in: ${state.user.email} (Admin)`
      : "Connected as Administrator";
  } else {
    elements.statusBadge.classList.remove("connected");
    elements.statusText.textContent = "Not Connected";
    elements.sessionInfo.classList.add("hidden");
    elements.loginForm.classList.remove("hidden");
  }
}

/**
 * Fetch client records to populate client selection dropdown
 */
async function fetchClients() {
  if (!state.token) return;

  try {
    const res = await fetch(`${state.apiUrl}/api/clients?limit=100`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    if (!res.ok) return;

    const json = await res.json();
    const list = json?.data?.clients || json?.data || [];
    state.clients = Array.isArray(list) ? list : [];

    // Populate dropdown if present
    if (elements.clientSelect) {
      elements.clientSelect.innerHTML = '<option value="">-- No Client (Assign Later) --</option>';
      state.clients.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c._id;
        const name = c.companyName || c.contactPerson || "Unnamed Client";
        const person = c.contactPerson && c.companyName ? ` (${c.contactPerson})` : "";
        opt.textContent = `${name}${person}`;
        elements.clientSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.warn("[CLIENTRA] Failed to fetch clients:", err);
  }
}

/**
 * Update transcript character counter
 */
function updateCharCount() {
  const len = elements.transcriptInput.value.length;
  elements.charCount.textContent = `${len.toLocaleString()} chars`;
}

/**
 * Handle down payment mode change
 */
function handleDownPaymentModeChange() {
  const mode = elements.downPaymentModeSelect.value;
  if (mode === "none") {
    elements.downPaymentValueRow.classList.add("hidden");
    elements.downPaymentValueInput.value = 0;
  } else {
    elements.downPaymentValueRow.classList.remove("hidden");
    elements.downPaymentValueLabel.textContent =
      mode === "percentage" ? "Down Payment (%)" : "Down Payment (₱)";
  }
  updateDownPaymentPreview();
}

/**
 * Recalculate and display upfront down payment value preview
 */
function updateDownPaymentPreview() {
  const mode = elements.downPaymentModeSelect.value;
  const budget = parseFloat(elements.budgetInput.value) || 0;
  const val = parseFloat(elements.downPaymentValueInput.value) || 0;

  if (mode === "none") {
    elements.downPaymentPreview.textContent = "₱0.00 (Paid upon completion)";
    return;
  }

  if (mode === "percentage") {
    const calculated = (budget * (val / 100));
    elements.downPaymentPreview.textContent = `₱${calculated.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${val}%)`;
  } else {
    elements.downPaymentPreview.textContent = `₱${val.toLocaleString("en-US", { minimumFractionDigits: 2 })} (Fixed)`;
  }
}

/**
 * Analyze transcript with Gemini via backend
 */
async function handleAnalyze() {
  const transcript = elements.transcriptInput.value.trim();
  const clientHint = elements.clientHintInput.value.trim();

  if (transcript.length < 10) {
    showNotice("Please provide or highlight at least 10 characters of conversation.", "error");
    return;
  }

  if (!state.token) {
    elements.settingsDrawer.classList.add("open");
    showNotice("Please log in as Administrator or sync your active tab first.", "warning");
    return;
  }

  if (state.user?.role && state.user.role !== "admin") {
    showNotice("Access denied: Only Administrators can generate and create projects.", "error");
    return;
  }

  setAnalyzingState(true);

  try {
    const res = await fetch(`${state.apiUrl}/api/chat/external-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ transcript, clientHint }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to analyze conversation.");
    }

    state.currentProposal = result.data;
    renderProposal(result.data);
    showNotice("Project extracted successfully! Review and commit below.", "success");
  } catch (err) {
    showNotice(err.message, "error");
  } finally {
    setAnalyzingState(false);
  }
}

/**
 * Set UI state during AI analysis
 */
function setAnalyzingState(isAnalyzing) {
  elements.analyzeBtn.disabled = isAnalyzing;
  if (isAnalyzing) {
    elements.analyzeSpinner.classList.remove("hidden");
    elements.analyzeBtnText.textContent = "Generating project...";
    elements.analyzingProgress.classList.remove("hidden");
  } else {
    elements.analyzeSpinner.classList.add("hidden");
    elements.analyzeBtnText.textContent = "Generate project";
    elements.analyzingProgress.classList.add("hidden");
  }
}

/**
 * Render the extracted proposal into the review form
 */
function renderProposal(proposal) {
  elements.previewCard.classList.remove("hidden");
  elements.successCard.classList.add("hidden");

  // Confidence badge
  const score = Math.round((proposal.confidenceScore || 0.85) * 100);
  elements.confidenceBadge.textContent = `${score}% AI Confidence`;

  // Basic Info
  elements.projectNameInput.value = proposal.projectName || "Client Project";
  elements.projectSummaryInput.value = proposal.clientSummary || "";

  // Financials
  elements.budgetInput.value = proposal.budgetCeiling !== null && proposal.budgetCeiling !== undefined ? proposal.budgetCeiling : "";

  // Down Payment
  const dpMode = proposal.downPayment?.mode || "none";
  elements.downPaymentModeSelect.value = dpMode;
  elements.downPaymentValueInput.value = proposal.downPayment?.value || 0;
  handleDownPaymentModeChange();

  // Timeline
  elements.startDateInput.value = proposal.startDate || "";
  elements.deadlineInput.value = proposal.targetDeadline || "";

  // Match client if clientHint matches any client name
  const hint = (elements.clientHintInput?.value || "").toLowerCase();
  state.matchedClientId = null;
  if (hint && state.clients.length > 0) {
    const matched = state.clients.find(
      (c) =>
        (c.companyName && hint.includes(c.companyName.toLowerCase())) ||
        (c.contactPerson && hint.includes(c.contactPerson.toLowerCase()))
    );
    if (matched) {
      state.matchedClientId = matched._id;
      if (elements.clientSelect) {
        elements.clientSelect.value = matched._id;
      }
    }
  }

  // Backlog Tasks
  renderTasks(proposal.tasks || []);

  // Smooth scroll into review card
  elements.previewCard.scrollIntoView({ behavior: "smooth" });
}

/**
 * Render dynamic task cards
 */
function renderTasks(tasks) {
  elements.tasksList.innerHTML = "";
  elements.taskCount.textContent = tasks.length;

  tasks.forEach((task, index) => {
    const item = document.createElement("div");
    item.className = "task-item";
    item.dataset.index = index;

    item.innerHTML = `
      <div class="task-top">
        <input type="text" class="task-title-input" value="${escapeHtml(task.title || "")}" placeholder="Task Title">
        <select class="task-priority-select" style="width: auto; padding: 4px 6px; font-size: 11px;">
          <option value="Low" ${task.priority === "Low" ? "selected" : ""}>Low</option>
          <option value="Medium" ${task.priority === "Medium" ? "selected" : ""}>Medium</option>
          <option value="High" ${task.priority === "High" ? "selected" : ""}>High</option>
          <option value="Urgent" ${task.priority === "Urgent" ? "selected" : ""}>Urgent</option>
        </select>
        <button type="button" class="btn-icon delete-task-btn" title="Remove Task" style="width: 24px; height: 24px; font-size: 12px; color: #ef4444;">
          ✕
        </button>
      </div>
      <textarea class="task-desc-input" rows="2" placeholder="Task deliverables / criteria...">${escapeHtml(task.description || "")}</textarea>
      <div class="form-group">
        <label style="font-size: 10px;">Required Skills (comma separated):</label>
        <input type="text" class="task-skills-input" value="${escapeHtml((task.requiredSkills || []).join(", "))}" placeholder="e.g. React, Figma, Node.js">
      </div>
    `;

    // Bind delete button
    item.querySelector(".delete-task-btn").addEventListener("click", () => {
      item.remove();
      updateTaskCount();
    });

    elements.tasksList.appendChild(item);
  });
}

/**
 * Add a manual task card
 */
function handleAddTask() {
  const tasks = collectTasksFromDOM();
  tasks.push({
    title: "New Deliverable",
    description: "",
    requiredSkills: [],
    priority: "Medium",
  });
  renderTasks(tasks);
}

/**
 * Update task count header badge
 */
function updateTaskCount() {
  const count = elements.tasksList.querySelectorAll(".task-item").length;
  elements.taskCount.textContent = count;
}

/**
 * Collect tasks from DOM inputs
 */
function collectTasksFromDOM() {
  const taskElements = elements.tasksList.querySelectorAll(".task-item");
  const tasks = [];

  taskElements.forEach((el) => {
    const title = el.querySelector(".task-title-input")?.value?.trim() || "Untitled Task";
    const priority = el.querySelector(".task-priority-select")?.value || "Medium";
    const description = el.querySelector(".task-desc-input")?.value?.trim() || "";
    const skillsRaw = el.querySelector(".task-skills-input")?.value || "";
    const requiredSkills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    tasks.push({
      title,
      priority,
      description,
      requiredSkills,
    });
  });

  return tasks;
}

/**
 * Commit the reviewed project and tasks to MongoDB via backend
 */
async function handleCommit() {
  if (!state.token) {
    elements.settingsDrawer.classList.add("open");
    showNotice("Please log in as Administrator or sync your active tab first.", "warning");
    return;
  }

  if (state.user?.role && state.user.role !== "admin") {
    showNotice("Access denied: Only Administrators can create projects.", "error");
    return;
  }

  const projectName = elements.projectNameInput.value.trim();
  if (!projectName) {
    showNotice("Project Name is required.", "error");
    return;
  }

  const tasks = collectTasksFromDOM();
  if (tasks.length === 0) {
    showNotice("At least one backlog task is required.", "error");
    return;
  }

  const clientId = elements.clientSelect?.value || state.matchedClientId || null;
  const clientSummary = elements.projectSummaryInput.value.trim();
  const budgetCeiling = parseFloat(elements.budgetInput.value) || 0;
  const startDate = elements.startDateInput.value || null;
  const targetDeadline = elements.deadlineInput.value || null;
  const downPaymentMode = elements.downPaymentModeSelect.value;
  const downPaymentValue = parseFloat(elements.downPaymentValueInput.value) || 0;

  const payload = {
    projectName,
    clientSummary,
    clientId,
    budgetCeiling,
    startDate,
    targetDeadline,
    downPayment: {
      mode: downPaymentMode,
      value: downPaymentValue,
    },
    tasks,
  };

  elements.commitBtn.disabled = true;
  elements.commitSpinner.classList.remove("hidden");
  elements.commitBtnText.textContent = "Creating in CLIENTRA...";

  try {
    const res = await fetch(`${state.apiUrl}/api/chat/external-commit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.message || "Failed to create project in CLIENTRA.");
    }

    state.createdProject = result.data?.project;
    elements.previewCard.classList.add("hidden");
    elements.successCard.classList.remove("hidden");

    elements.successDetails.textContent = `"${projectName}" created with ${tasks.length} tasks in Planning stage.`;
    showNotice("Project successfully created in CLIENTRA!", "success");
    elements.successCard.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    showNotice(err.message, "error");
  } finally {
    elements.commitBtn.disabled = false;
    elements.commitSpinner.classList.add("hidden");
    elements.commitBtnText.textContent = "🚀 Create Project in CLIENTRA";
  }
}

/**
 * Display notice banner
 */
function showNotice(message, type = "info") {
  elements.globalNotice.className = `notice notice-${type}`;
  elements.globalNoticeText.textContent = message;
  elements.globalNotice.classList.remove("hidden");

  setTimeout(() => {
    elements.globalNotice.classList.add("hidden");
  }, 5000);
}

/**
 * Utility: HTML escape string
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
