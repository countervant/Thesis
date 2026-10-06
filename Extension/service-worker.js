/**
 * CLIENTRA Project Assistant - Service Worker (Manifest V3)
 */

const API_URL = "https://server1-ndmx.onrender.com";
const APP_URL = "https://clientra.me";

// Configure side panel behavior on installation
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Enable side panel to open on action icon click (no default_popup)
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("[CLIENTRA SW] setPanelBehavior error:", error);
  }

  // Clear any legacy localhost URLs from storage
  await chrome.storage.local.remove(["apiUrl", "appUrl"]);

  // Create context menu for quick selection extraction
  try {
    chrome.contextMenus.create({
      id: "clientra_extract_selection",
      title: "✨ Extract to CLIENTRA Project",
      contexts: ["selection"],
    });
  } catch (err) {
    console.warn("[CLIENTRA SW] contextMenus create error:", err);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "clientra_extract_selection" && info.selectionText) {
    const text = info.selectionText.trim();
    const tabUrl = tab?.url || "";
    const tabTitle = tab?.title || "";

    // Save pending transcript to storage so side panel picks it up
    await chrome.storage.local.set({
      pendingTranscript: text,
      pendingTabUrl: tabUrl,
      pendingTabTitle: tabTitle,
      pendingTimestamp: Date.now(),
    });

    // Open side panel in the active window
    if (tab?.windowId) {
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (err) {
        console.warn("[CLIENTRA SW] sidePanel.open error:", err);
      }
    }

    // Notify side panel if it's already active
    try {
      await chrome.runtime.sendMessage({
        action: "SELECTION_RECEIVED",
        text,
        tabUrl,
        tabTitle,
      });
    } catch {
      // Side panel may not be open yet, it will read from storage on launch
    }

    // Flash a temporary confirmation badge
    if (tab?.id) {
      try {
        await chrome.action.setBadgeText({ tabId: tab.id, text: "✓" });
        await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#8b5cf6" });
        setTimeout(async () => {
          try {
            await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
          } catch {}
        }, 2500);
      } catch {}
    }

    // Inform the content script to display an inline toast
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: "SHOW_TOAST",
          message: "Conversation captured into CLIENTRA Assistant!",
        });
      } catch {}
    }
  }
});

// Listen for messages from side panel or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_ACTIVE_TAB_INFO") {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        sendResponse({
          success: true,
          url: tab?.url || "",
          title: tab?.title || "",
          tabId: tab?.id || null,
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
