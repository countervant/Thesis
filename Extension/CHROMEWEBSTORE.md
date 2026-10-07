# Chrome Web Store Publishing Guide — CLIENTRA Assistant

> Everything you need to publish **CLIENTRA - AI Project Generator** to the Google Chrome Web Store.

---

## 1. Quick Prerequisites

1. **Google Account & Developer Registration**:
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
   - Sign in with your Google account.
   - Pay the one-time **$5 USD** Google developer registration fee (required once per account).
   - Complete your developer profile (Developer name, contact email).

2. **Your Extension Package**:
   - The production ZIP file is already built and located at:
     `c:\My Projects\Thesis\Extension\clientra-extension.zip`
   - It contains only production code (`manifest.json`, `sidepanel.*`, `service-worker.js`, `content.js`, and `icons/`).

---

## 2. Step-by-Step Submission Walkthrough

### Step A: Upload the ZIP
1. In the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/), click **"New Item"** (or **"Add new item"**).
2. Drag and drop or browse to select `Extension/clientra-extension.zip`.
3. Chrome will automatically validate the package. Once uploaded, you will be taken to the extension management tabs.

---

### Step B: Store Listing Tab

Fill in the following fields (copy-paste ready):

* **Package Name**: `CLIENTRA - AI Project Generator`
* **Summary (Short Description)** *(Max 132 characters)*:
  ```text
  Extract project scopes, milestones, budgets, and deadlines from client chats into your CLIENTRA workspace.
  ```
* **Detailed Description**:
  ```text
  Transform unstructured freelance and client conversations into production-ready project plans and backlogs in seconds.

  Whether communicating with clients on Upwork, WhatsApp Web, Gmail, Slack, or Fiverr, CLIENTRA Assistant analyzes the conversation history to automatically extract:
  - Project title and executive scope summary
  - Total budget and milestone deadlines
  - Down payment agreements (percentage or fixed amounts)
  - Actionable backlog tasks with priority levels

  Key Features:
  - Side Panel Integration: Work side-by-side with your client chat tabs without switching windows.
  - One-Click Generation: Highlight chat messages on any webpage and generate the project plan instantly.
  - Review & Edit: Refine deliverables, adjust deadlines, and verify budgets before finalizing.
  - Direct Sync: Generates projects directly inside your live CLIENTRA workspace.

  How to Use:
  1. Open any tab containing a client conversation (Upwork, WhatsApp Web, email, etc.).
  2. Open the CLIENTRA Assistant side panel from your Chrome extensions menu.
  3. Click "Generate project" (or highlight specific text on the page first).
  4. Review the extracted proposal and click "Create Project in CLIENTRA".
  5. Your project is automatically created in your CLIENTRA dashboard.
  ```
* **Category**:
  Select **Productivity** or **Developer Tools**.
* **Primary Language**:
  Select **English**.

---

### Step C: Graphic Assets

1. **Store Icon (128x128)**:
   - Upload the pre-generated icon located at:
     `Extension/icons/icon-128.png`
2. **Screenshots** *(Google requires at least 1 screenshot)*:
   - Size: **1280×800** or **640×400** pixels (PNG or JPEG, no transparency).
   - Take a screenshot of the CLIENTRA side panel open next to a chat tab (e.g. Upwork or WhatsApp Web) showing a generated proposal.
   - Recommended: 2-3 screenshots showing:
     - Side panel analyzing a conversation
     - Proposal review form with budget, dates, and tasks
     - Newly created project in the CLIENTRA dashboard

---

### Step D: Privacy Practices Tab (Crucial for Approval)

Google's review team strictly checks this section. Copy the justifications below:

#### 1. Single Purpose Description:
```text
Extract project scopes, deliverables, budgets, and deadlines from client chat conversations on external web pages and create them directly into the user's CLIENTRA project management workspace.
```

#### 2. Permissions Justification:
* **`sidePanel`**:
  ```text
  Displays the project generator assistant side-by-side with the user's active client conversation tabs without obstructing the page.
  ```
* **`storage`**:
  ```text
  Stores user session tokens and connection preferences locally in the browser so the user remains authenticated.
  ```
* **`contextMenus`**:
  ```text
  Adds a convenient right-click context menu option allowing users to highlight chat text and send it directly into the assistant.
  ```
* **`tabs`**:
  ```text
  Reads the active tab title and URL to provide client name context and switch directly to the CLIENTRA dashboard when the project is created.
  ```
* **`scripting`**:
  ```text
  Used to read user-selected chat text on the active webpage when the user clicks 'Generate project'.
  ```
* **Host Permissions (`<all_urls>`)**:
  ```text
  Enables the extension to read user-highlighted conversation text across diverse client communication websites (such as Upwork, Freelancer, WhatsApp Web, Slack, Gmail) and communicate with the CLIENTRA backend API to persist projects.
  ```

#### 3. Data Usage Declarations:
* **Does your extension collect user data?**:
  Select **Yes** (Authentication Info and Website Content).
  - **Authentication Info**: Used solely to maintain session authentication with the user's CLIENTRA account. Not sold or transferred to third parties.
  - **Website Content**: Only the text explicitly selected or highlighted by the user from client conversations for project synthesis.
* **Certifications**:
  - Check: *"I certify that this extension does not sell user data to third parties."*
  - Check: *"I certify that this extension does not use or transfer user data for purposes unrelated to the extension's core single purpose."*
  - Check: *"I certify that this extension does not use or transfer user data to determine creditworthiness or for lending purposes."*
* **Privacy Policy URL**:
  - Provide a live URL to your privacy policy (e.g., `https://clientra.me/privacy` or your project documentation link).

---

### Step E: Distribution & Submission

1. **Visibility**:
   - **Public**: Searchable and installable by anyone on the Chrome Web Store.
   - **Unlisted**: Only people with the direct link can install (great for testing or restricted company use).
2. Click **"Submit for review"**.
3. **Review Timeline**:
   - Google usually reviews new extensions within **1 to 3 business days**.
   - You will receive an email once approved, after which your extension will be live on the Chrome Web Store!
