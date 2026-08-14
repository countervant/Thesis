# AGENTS.md

# Project Overview

This repository contains a production-quality application.

Always prioritize consistency with the existing architecture over introducing new patterns.

---

# Tech Stack

## Frontend

- React 19
- JavaScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- React Router
- TanStack React Query
- Axios

## Backend

- Express.js
- JavaScript
- MongoDB Atlas
- Mongoose
- JWT Authentication
- Cloudinary

---

# Architecture

Always follow the existing project architecture.

Before creating anything new:

- Search for an existing implementation.
- Reuse existing components.
- Extend existing modules whenever possible.
- Avoid duplicate logic.

---

# Folder Structure

Keep folders organized by feature or responsibility.

Example:

```text
src/
├── components/
├── pages/
├── hooks/
├── services/
├── utils/
├── constants/
└── lib/

Component Structure

Every component must have its own PascalCase folder.

The main .jsx component file must always have the exact same name as its folder.

Core rule:

One component folder, one matching main component file, and related files kept inside that folder.

Example:

src/
└── components/
    ├── UserCard/
    │   └── UserCard.jsx
    │
    ├── ActivityDialog/
    │   └── ActivityDialog.jsx
    │
    ├── Sidebar/
    │   ├── Sidebar.jsx
    │   ├── SidebarItem.jsx
    │   ├── SidebarSection.jsx
    │   ├── useSidebar.js
    │   └── sidebarUtils.js
    │
    ├── EmptyState/
    │   └── EmptyState.jsx
    │
    └── LoadingSkeleton/
        └── LoadingSkeleton.jsx

Rules:

Always create a PascalCase folder for every component.
The main component file must have the exact same name as the folder.
Do not place component .jsx files directly inside /components.
Keep all files related to a component inside that component's folder.
Supporting components inside a component folder must use PascalCase file names.
Hooks inside a component folder must use camelCase and start with use.
Utility functions inside a component folder must use camelCase.
Local variables must use camelCase.
Global constants must use UPPER_SNAKE_CASE.

Do not use this structure:

components/
├── UserCard.jsx
├── Sidebar.jsx
└── ActivityDialog.jsx

Use this structure:

components/
├── UserCard/
│   └── UserCard.jsx
├── Sidebar/
│   └── Sidebar.jsx
└── ActivityDialog/
    └── ActivityDialog.jsx
Keep It Simple

Simple components should normally stay in one file.

Example:

components/
└── UserCard/
    └── UserCard.jsx

Only add related files when the component becomes more complex.

Example:

components/
└── Sidebar/
    ├── Sidebar.jsx
    ├── SidebarItem.jsx
    ├── SidebarSection.jsx
    ├── useSidebar.js
    └── sidebarUtils.js

Avoid creating files like:

CardHeader.jsx
CardBody.jsx
CardFooter.jsx

unless the component has grown large enough that splitting clearly improves readability and maintainability.

Prefer one well-organized file over multiple tiny files.

Naming Convention
Item	Convention	Example
Component folder	PascalCase	UserCard/
React component	PascalCase	UserCard
Main component file	Same as folder	UserCard/UserCard.jsx
Supporting component	PascalCase	SidebarItem.jsx
Hook	camelCase starting with use	useSidebar.js
Utility function	camelCase	formatUserName.js
Local variable	camelCase	isLoading
Global constant	UPPER_SNAKE_CASE	MAX_MENU_ITEMS

Folders:

PascalCase

Examples:

UserCard
ActivityDialog
Sidebar

Components:

PascalCase

Functions:

camelCase

Variables:

camelCase

Constants:

UPPER_SNAKE_CASE when global
camelCase when local
JavaScript Rules
Use JavaScript only.
Do not introduce TypeScript.
Do not create .ts or .tsx files.
React components must use .jsx.
Non-component JavaScript files must use .js.
Do not use TypeScript syntax.
Do not add interfaces, type aliases, enums, or type annotations.
Prefer modern ES6+ syntax.
Prefer const by default.
Use let only when reassignment is required.
Never use var.
Prefer destructuring when it improves readability.
Prefer optional chaining where appropriate.
Prefer nullish coalescing where appropriate.
Use async/await for asynchronous operations.
Avoid unnecessary type coercion.
Validate external and user-provided data at runtime.
Use JSDoc only when it provides meaningful clarification or when the existing codebase already uses it.
Do not introduce a new typing or validation library without approval.

Bad:

var data = response.data;

Good:

const data = response.data;

Bad:

const getUser = async (id: string): Promise<User> => {
  // ...
};

Good:

const getUser = async (id) => {
  // ...
};
React Rules
Functional components only.
Use Hooks.
No class components.
One responsibility per component.
Keep components readable.
Use .jsx for files containing JSX.
Use .js for hooks, utilities, services, constants, and other non-JSX modules.
Keep state as local as possible.
Avoid unnecessary effects.
Do not use useEffect for values that can be derived during render.
Prefer composition over massive components.
React Query

Always use React Query for server state.

Use:

useQuery
useMutation
invalidateQueries()

Avoid manual refetching if invalidation is enough.

Do not duplicate server state in local component state unless there is a clear reason.

API Standards

Use the existing Axios instance.

Never use fetch() directly.

Always handle:

loading
success
error

Return consistent API responses.

Example:

{
  "success": true,
  "message": "Activity created",
  "data": {}
}

Do not change existing API contracts unless explicitly requested.

Backend Standards

Follow MVC.

Controllers:

Business logic only.

Routes:

Routing only.

Models:

Schema only.

Middleware:

Authentication
Validation
Error handling

Keep route handlers thin.

Reuse existing middleware, helpers, services, and utilities before creating new ones.

Database Standards
Validate everything.
Never trust client input.
Use Mongoose validation.
Create indexes where appropriate.
Soft delete when applicable.
Avoid unnecessary database queries.
Use existing model methods and query patterns whenever possible.
Authentication
Use JWT Authentication.
Never expose sensitive information.
Protect all required endpoints.
Always verify authorization in addition to authentication where required.
Never trust client-provided roles, ownership, or permission data.
UI Guidelines

Use shadcn/ui whenever possible.

Preferred style:

modern
minimal
flat
subtle shadows
rounded-lg
consistent spacing

Avoid:

excessive gradients
glassmorphism
inconsistent spacing
random colors

Reuse existing design patterns and components before creating new ones.

Tailwind

Prefer utility classes.

Keep classes organized in this order:

Layout
Spacing
Typography
Colors
Effects

Avoid unnecessary custom CSS when Tailwind utilities can accomplish the same result.

Follow existing responsive patterns.

Code Style
Prioritize readability.
Prefer early returns.
Avoid deep nesting.
Keep functions focused.
Remove unused code.
Keep files concise.
Do not over-engineer.
Avoid unnecessary abstractions.
Avoid magic values when a meaningful constant already exists or would improve clarity.
Match the surrounding code style.
Do not reformat or rewrite unrelated code.
Error Handling
Return meaningful messages.
Do not silently ignore errors.
Log unexpected errors.
Do not expose internal implementation details.
Do not expose stack traces.
Do not expose secrets or sensitive data to clients.
Use the existing error-handling architecture whenever possible.
Performance
Avoid unnecessary renders.
Memoize only when beneficial.
Do not optimize prematurely.
Avoid unnecessary API requests.
Use React Query caching and invalidation appropriately.
Avoid unnecessary MongoDB queries and population.
Definition of Done

Before finishing a task, verify:

Builds successfully.
No JavaScript syntax errors.
No ESLint errors.
No duplicated logic.
Responsive UI.
Existing functionality still works.
Existing components are reused whenever possible.
Existing hooks, utilities, and services are reused whenever possible.
No unnecessary TypeScript files or syntax were introduced.
No unrelated code was modified.
Forbidden Practices

Do not:

Introduce TypeScript.
Create .ts or .tsx files.
Install packages without approval.
Duplicate components.
Duplicate utility functions.
Duplicate hooks.
Duplicate API or service logic.
Remove existing functionality unless requested.
Change API contracts unless requested.
Introduce new architecture without approval.
Use fetch() when an Axios instance already exists.
Bypass React Query for server state.
Rewrite unrelated code.
Over-engineer simple features.
AI Instructions

Before writing code:

Read the existing implementation.
Follow the existing architecture.
Search for similar implementations first.
Reuse components.
Reuse hooks.
Reuse utilities.
Reuse services.
Keep changes as small as possible.
Match the existing coding style.
Do not rewrite unrelated code.
Do not introduce TypeScript.
Do not install packages without approval.
Explain architectural changes when necessary.

When implementing a feature:

Find the closest existing implementation.
Understand its component, hook, API, and backend patterns.
Reuse those patterns.
Modify the smallest possible surface area.
Verify that existing functionality remains intact.
Run the appropriate build and lint checks.

When unsure:

Prefer consistency with the existing project over personal preference.