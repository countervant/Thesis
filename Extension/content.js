/**
 * CLIENTRA Project Assistant - Content Script
 * Captures selections, coordinates with side panel, and provides visual confirmation toasts.
 */

// Handle incoming messages from extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SELECTION") {
    const selected = window.getSelection()?.toString()?.trim() || "";
    sendResponse({ selection: selected, title: document.title, url: window.location.href });
    return false;
  }

  if (request.action === "GET_CLIENTRA_AUTH") {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("clientra_token") ||
        sessionStorage.getItem("token") ||
        "";
      const rawUser =
        localStorage.getItem("user") ||
        localStorage.getItem("clientra_user") ||
        sessionStorage.getItem("user") ||
        "";

      let user = null;
      if (rawUser) {
        try {
          user = JSON.parse(rawUser);
        } catch {}
      }

      sendResponse({ success: true, token, user, origin: window.location.origin });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
    return false;
  }

  if (request.action === "SHOW_TOAST") {
    showFloatingToast(request.message || "Captured for CLIENTRA!");
    sendResponse({ success: true });
    return false;
  }
});

/**
 * Renders a sleek floating notification on the page
 */
function showFloatingToast(message) {
  const existing = document.getElementById("clientra-toast-root");
  if (existing) existing.remove();

  const container = document.createElement("div");
  container.id = "clientra-toast-root";
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0f172a;
    color: #ffffff;
    border: 1px solid #334155;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
    padding: 12px 18px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.4;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    transform: translateY(20px);
    opacity: 0;
    pointer-events: none;
  `;

  const toastIcon = document.createElement("img");
  toastIcon.src = chrome.runtime.getURL("icons/icon-48.png");
  toastIcon.alt = "CLIENTRA";
  toastIcon.style.cssText = `
    width: 22px;
    height: 22px;
    border-radius: 4px;
    object-fit: contain;
    flex-shrink: 0;
  `;

  const text = document.createElement("span");
  text.textContent = message;

  container.appendChild(toastIcon);
  container.appendChild(text);
  document.body.appendChild(container);

  // Trigger smooth enter animation
  requestAnimationFrame(() => {
    container.style.transform = "translateY(0)";
    container.style.opacity = "1";
  });

  // Fade out and remove
  setTimeout(() => {
    container.style.transform = "translateY(10px)";
    container.style.opacity = "0";
    setTimeout(() => container.remove(), 350);
  }, 3200);
}
