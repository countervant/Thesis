# CLIENTRA AI Project Generator — Chrome Extension

Turn client conversations on external websites (Upwork, WhatsApp Web, Gmail, Slack, Fiverr, Facebook Messenger) into structured projects in CLIENTRA with one click using Gemini AI.

---

## Features

- **Side-by-Side Assistant**: Stays open in Chrome's Side Panel right next to your client chat tabs.
- **Instant Text Capture**: Highlight any chat text and click **"Grab Selection"** or right-click and choose **"✨ Extract to CLIENTRA Project"**.
- **Gemini AI Extraction**: Analyzes the transcript to synthesize:
  - Professional Project Title
  - Executive Scope & Deliverables
  - Total Budget (₱)
  - Down Payment terms (50% upfront, percentage, or fixed deposit)
  - Kickoff & Deadline dates
  - Actionable Backlog Tasks with required skills and priority levels (NO estimated hours)
- **Review & Edit**: Full control to tweak fields, select a client from your CLIENTRA database, or add/remove tasks.
- **One-Click Commit**: Instantly creates the project and backlog tasks directly into CLIENTRA's MongoDB database.
- **Auto-Sync Auth**: Automatically syncs your active session when CLIENTRA is open in any tab.

---

## Installation (Load Unpacked Extension)

1. Open **Google Chrome** (or Edge / Brave / any Chromium browser).
2. In the URL bar, go to:
   ```text
   chrome://extensions
   ```
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button in the top-left.
5. Select the `Extension` folder in this repository:
   ```text
   c:\My Projects\Thesis\Extension
   ```
6. The **CLIENTRA - AI Project Generator** extension is now installed!
7. Pin the extension to your toolbar by clicking the puzzle icon in Chrome and clicking the pin icon next to **CLIENTRA - AI Project Generator**.

---

## How to Use

### 1. Connect to CLIENTRA
- Click the **CLIENTRA** extension icon in your toolbar to open the Side Panel.
- If your CLIENTRA dashboard (`https://clientra.me`) is already open in Chrome, click **⚙ (Settings)** -> **⚡ Auto-Sync from clientra.me Tab**.
- Alternatively, enter your admin email and password in the settings drawer and click **Log In**.

### 2. Capture a Client Conversation
- Open any website with a client chat (e.g., **Upwork Messages**, **WhatsApp Web**, **Facebook Messenger**, **Gmail**, or **Fiverr**).
- Highlight the messages discussing the project requirements, budget, down payment, or timeline.
- In the side panel, click **📋 Grab Selection** (or right-click the highlighted text -> **✨ Extract to CLIENTRA Project**).

### 3. Generate with Gemini AI
- Click **Generate project**.
- The AI synthesizes the scope, budget, timeline, and backlog tasks within seconds.

### 4. Review & Commit
- Verify or adjust any details.
- Optionally select a target client from the dropdown.
- Click **🚀 Create Project in CLIENTRA**.
- Click **Open in CLIENTRA ↗** to view your brand new project in the dashboard!

