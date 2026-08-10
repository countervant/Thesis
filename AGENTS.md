# AGENTS.md

# Project Overview

This repository contains a production-quality application.

Always prioritize consistency with the existing architecture over introducing new patterns.

---

# Tech Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- React Router
- TanStack React Query
- Axios

## Backend

- Express.js
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

Example

src/
├── components/
├── pages/
├── hooks/
├── services/
├── utils/
├── types/
├── constants/
├── lib/

---

# Component Structure

Every component must get its own PascalCase folder.

The main `.tsx` component file must always have the exact same name as its folder.

Core rule:

One component folder, one matching main component file, and related files kept inside that folder.

Example

```text
src/
└── components/
    ├── UserCard/
    │   └── UserCard.tsx
    │
    ├── ActivityDialog/
    │   └── ActivityDialog.tsx
    │
    ├── Sidebar/
    │   ├── Sidebar.tsx
    │   ├── SidebarItem.tsx
    │   ├── SidebarSection.tsx
    │   ├── useSidebar.ts
    │   └── types.ts
    │
    ├── EmptyState/
    │   └── EmptyState.tsx
    │
    └── LoadingSkeleton/
        └── LoadingSkeleton.tsx
```

Rules

- Always create a PascalCase folder for every component.
- The main component file must have the exact same name as the folder.
- Do not place component `.tsx` files directly inside `/components`.
- Keep all files related to a component inside that component's folder.
- Supporting components inside a component folder must use PascalCase file names.
- Hooks inside a component folder must use camelCase and start with `use`.
- Utility functions inside a component folder must use camelCase.
- Type and interface names must use PascalCase.
- Local variables must use camelCase.
- Global constants must use UPPER_SNAKE_CASE.

Do not use this structure:

```text
components/
├── UserCard.tsx
├── Sidebar.tsx
└── ActivityDialog.tsx
```

Use this structure:

```text
components/
├── UserCard/
│   └── UserCard.tsx
├── Sidebar/
│   └── Sidebar.tsx
└── ActivityDialog/
    └── ActivityDialog.tsx
```

## Keep It Simple

Simple components should normally stay in one file.

Example

```text
components/
└── UserCard/
    └── UserCard.tsx
```

Only add related files when the component becomes more complex.

Example

```text
components/
└── Sidebar/
    ├── Sidebar.tsx
    ├── SidebarItem.tsx
    ├── SidebarSection.tsx
    ├── useSidebar.ts
    └── types.ts
```

Avoid creating files like:

- CardHeader.tsx
- CardBody.tsx
- CardFooter.tsx

unless the component has grown large enough that splitting clearly improves readability and maintainability.

Prefer one well-organized file over multiple tiny files.

# Naming Convention

| Item | Convention | Example |
| --- | --- | --- |
| Component folder | PascalCase | `UserCard/` |
| React component | PascalCase | `UserCard` |
| Main component file | Same as folder | `UserCard/UserCard.tsx` |
| Supporting component | PascalCase | `SidebarItem.tsx` |
| Hook | camelCase starting with `use` | `useSidebar.ts` |
| Utility function | camelCase | `formatUserName.ts` |
| Types/interfaces | PascalCase | `UserCardProps` |
| Local variable | camelCase | `isLoading` |
| Global constant | UPPER_SNAKE_CASE | `MAX_MENU_ITEMS` |

Folders

PascalCase

Example

UserCard

ActivityDialog

Sidebar

Components

PascalCase

Functions

camelCase

Variables

camelCase

Types

PascalCase

Interfaces

PascalCase

Enums

PascalCase

Constants

UPPER_SNAKE_CASE when global

camelCase when local

---

# TypeScript Rules

- Never use `any`.
- Prefer explicit interfaces.
- Use strict typing.
- Prefer inference when obvious.
- Avoid unnecessary type assertions.

Bad

const data: any = response.data;

Good

const data: Menu[] = response.data;

---

# React Rules

- Functional components only.
- Use Hooks.
- No class components.
- One responsibility per component.
- Keep components readable.

Prefer composition over massive components.

---

# React Query

Always use React Query for server state.

Use

- useQuery
- useMutation
- invalidateQueries()

Avoid manual refetching if invalidation is enough.

---

# API Standards

Use Axios instance.

Never use fetch() directly.

Always handle

- loading
- success
- error

Return consistent API responses.

Example

{
    "success": true,
    "message": "Activity created",
    "data": {}
}

---

# Backend Standards

Follow MVC.

Controllers

Business logic only.

Routes

Routing only.

Models

Schema only.

Middleware

Authentication

Validation

Error handling

---

# Database Standards

Validate everything.

Never trust client input.

Use Mongoose validation.

Create indexes where appropriate.

Soft delete when applicable.

---

# Authentication

JWT Authentication.

Never expose sensitive information.

Protect all required endpoints.

---

# UI Guidelines

Use shadcn/ui whenever possible.

Preferred style

- modern
- minimal
- flat
- subtle shadows
- rounded-lg
- consistent spacing

Avoid

- excessive gradients
- glassmorphism
- inconsistent spacing
- random colors

---

# Tailwind

Prefer utility classes.

Keep classes organized.

Example order

layout

spacing

typography

colors

effects

---

# Code Style

- Prioritize readability.
- Prefer early returns.
- Avoid deep nesting.
- Keep functions focused.
- Remove unused code.
- Keep files concise.
- Do not over-engineer.

---

# Error Handling

Return meaningful messages.

Do not silently ignore errors.

Log unexpected errors.

---

# Performance

Avoid unnecessary renders.

Memoize only when beneficial.

Do not optimize prematurely.

---

# Definition of Done

Before finishing a task verify

- Builds successfully
- No TypeScript errors
- No ESLint errors
- No duplicated logic
- Responsive UI
- Existing functionality still works
- Uses existing components whenever possible

---

# Forbidden Practices

Do not

- use any
- install packages without approval
- duplicate components
- duplicate utility functions
- remove existing functionality unless requested
- change API contracts unless requested
- introduce new architecture without approval

---

# AI Instructions

Before writing code

- Read the existing implementation.
- Follow existing architecture.
- Reuse components.
- Reuse hooks.
- Reuse utilities.
- Keep changes as small as possible.
- Match the existing coding style.
- Do not rewrite unrelated code.
- Explain architectural changes when necessary.

When unsure

Prefer consistency with the existing project over personal preference.
