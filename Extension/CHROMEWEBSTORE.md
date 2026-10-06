# Chrome Web Store Listing — CLIENTRA AI Project Generator

## Listing Metadata

- **Name**: CLIENTRA - AI Project Generator
- **Version**: 1.0.0
- **Short Description**: Extract project scopes, milestones, budgets, and deadlines from client chats into CLIENTRA with AI.
- **Category**: Productivity / Developer Tools
- **Default Language**: English

## Detailed Description

Transform unstructured freelance and client conversations into production-ready project plans and backlogs in seconds.

Whether communicating with clients on Upwork, WhatsApp Web, Gmail, Slack, or Fiverr, CLIENTRA AI Project Generator analyzes the conversation history to automatically extract:
- Project Title and Executive Deliverables Summary
- Total Budget and Ceiling
- Down Payment & Upfront Deposit Agreements (percentage or fixed amounts)
- Start Dates and Milestone Deadlines
- Actionable Backlog Tasks with Priority Levels and Required Tech Stacks

### Key Features
- **Side Panel Integration**: Work side-by-side with your chat tabs without switching context.
- **Context Menu & Selection Grab**: Highlight chat messages on any tab and send directly to the assistant with one click.
- **Full Review & Customization**: Edit project specs, assign directly to registered clients, and adjust task priority before creating.
- **Direct Database Synchronization**: Creates projects directly inside your CLIENTRA workspace.

## Permissions Justification

| Permission | Justification |
| :--- | :--- |
| `sidePanel` | Displays the assistant side-by-side with client chat applications on external websites. |
| `storage` | Persists user connection preferences, backend API endpoint, and active JWT session token locally. |
| `contextMenus` | Adds a right-click "Extract to CLIENTRA Project" action on selected text across web pages. |
| `tabs` | Identifies active tab title and URL to provide client source context and sync active workspace sessions. |
| `scripting` | Captures user-highlighted text from active client conversation tabs. |
| `host_permissions: <all_urls>` | Enables reading user-selected conversation text on client communication platforms (Upwork, WhatsApp Web, Gmail, Slack, Fiverr) and connecting to the CLIENTRA backend server. |

## Privacy & Data Use

- **Data Collected**: Only the text explicitly highlighted or pasted by the user for extraction.
- **Storage**: Authentication tokens and URLs are stored strictly on the user's local machine via `chrome.storage.local`.
- **Transmission**: Data is transmitted solely to the user's configured CLIENTRA server endpoint for Gemini AI analysis and project persistence. No third-party tracking or telemetry is included.
