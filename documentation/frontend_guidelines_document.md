# Frontend Guidelines Document for ai-menu-refresh-platform

This document outlines the frontend architecture, design principles, styling, component structure, state management, routing, performance optimizations, testing strategies, and overall summary for the ai-menu-refresh-platform. It uses everyday language to ensure clarity for all stakeholders.

## 1. Frontend Architecture

### 1.1 Overview
- **Framework**: React (v18) provides a component-based approach, making UIs modular and easy to maintain.  
- **Bundler**: Vite offers fast development builds and hot module replacement, accelerating iteration.
- **Type System**: TypeScript ensures type safety across components, services, and data models.
- **UI Library**: `shadcn/ui` (built on Radix UI) supplies a set of accessible, customizable components (forms, tables, dialogs, cards).
- **Styling**: Tailwind CSS (utility-first) for rapid styling and design consistency.
- **Animations**: Framer Motion for smooth, declarative animations.
- **Icons**: Lucide React for a modern icon set.
- **Charts**: Recharts for data visualizations (e.g., menu analytics).
- **Theming**: next-themes to toggle light/dark modes.

### 1.2 Scalability, Maintainability & Performance
- **Modularity**: Components live in feature-based folders (`components/menu`, `components/ai`, etc.), supporting independent development.  
- **Path Aliases**: `@/components`, `@/lib`, etc., simplify imports and reduce path complexity.
- **Server-State Management**: TanStack Query handles caching, syncing, and updating data without manual state logic.  
- **Form Validation**: React Hook Form + Zod keep form logic declarative and reliable.  
- **Code Splitting & Lazy Loading**: Vite’s dynamic imports and React.lazy/loadable-components ensure only necessary code loads per route.
- **Tree-Shaking**: Vite and modern ESM eliminate unused code for leaner bundles.

## 2. Design Principles

### 2.1 Key Principles
- **Usability**: Clear, intuitive layouts and workflows tailored to chefs’ day-to-day tasks.  
- **Accessibility**: Built on Radix UI via `shadcn/ui` components, ensuring keyboard navigation, screen-reader support, and ARIA attributes.
- **Responsiveness**: Mobile-first design; Tailwind’s responsive utilities adapt layouts across screen sizes.
- **Consistency**: A shared component library and theme system guarantee a unified look and feel.
- **Feedback & Affordance**: Interactive elements provide hover, focus, disabled, and loading states for clarity.

### 2.2 Application of Principles
- **Forms**: Group related fields, provide inline validation messages, and disable submission until valid.  
- **Tables**: Sortable columns, pagination, and clear empty-state messaging for large menus.  
- **Dialogs & Modals**: Confirm destructive actions (e.g., deleting a dish) with clear calls to action.
- **Animations**: Subtle motion cues (Framer Motion) guide user attention without distraction.

## 3. Styling and Theming

### 3.1 Styling Approach
- **Methodology**: Utility-first CSS via Tailwind. Component-specific styles encapsulated in small, reusable classes.  
- **Pre-processor**: No additional pre-processor; Tailwind’s built-in features cover most needs.

### 3.2 Theming
- **Light & Dark Modes**: Managed by next-themes. Theme preference persists across sessions and follows system settings by default.
- **Customization**: Override Tailwind’s `theme` in `tailwind.config.js` for custom colors, spacing, and fonts.

### 3.3 Visual Style
- **Design Style**: Modern flat design with subtle shadows, rounded corners, and clean typography.  
- **Color Palette**:
  • Primary: #4F46E5 (indigo-600)  
  • Primary Light: #E0E7FF (indigo-100)  
  • Secondary: #F59E0B (amber-500)  
  • Background: #F9FAFB (gray-50) / #111827 (gray-900 in dark)  
  • Text: #1F2937 (gray-800) / #F3F4F6 (gray-100 in dark)  
  • Success: #10B981 (emerald-500)  
  • Warning: #FBBF24 (yellow-400)  
  • Error: #EF4444 (red-500)

- **Font**: Inter (system font stack fallback), chosen for clarity and readability.

## 4. Component Structure

### 4.1 Organization
- **components/**  
  ├─ ui/         # Core shared UI primitives (Button, Input, Dialog, Table, Card)  
  ├─ layout/     # Reusable layout elements (Header, Sidebar, Footer, DashboardContainer)  
  ├─ menu/       # Menu-specific components (MenuTable, DishForm, MenuItemCard)  
  └─ ai/         # AI suggestion components (SuggestionCard, RecommendationList)

- **pages/** or **features/** for route-level components: Login, Dashboard, Settings, MenuManagement.
- **lib/** (or **services/**) for data clients:
  • supabase/client.ts  
  • ai/api.ts (encapsulates AI service calls)

### 4.2 Reusability & Maintainability
- **Atomic Design**: UI primitives form molecules and organisms, promoting consistency.  
- **Props-Driven**: Components accept props for customization, minimizing duplication.  
- **Storybook (optional)**: Document and test components in isolation.

## 5. State Management

### 5.1 Server State
- **Library**: TanStack Query for fetching, caching, updating, and synchronizing with Supabase and AI services.
- **Patterns**:  
  • `useQuery` for read operations (e.g., fetching menus)  
  • `useMutation` for write operations (e.g., adding a dish, generating AI insights)  
  • Automatic refetching, optimistic updates, and error handling.

### 5.2 Client/UI State
- **Theming**: next-themes’ React Context for light/dark toggle.  
- **Local State**: React `useState` or `useReducer` for simple UI states (e.g., open/close dialogs).  
- **Form State**: React Hook Form manages form values, touched fields, and validation.

## 6. Routing and Navigation

- **Library**: react-router-dom (to be integrated).  
- **Structure**:  
  • Public routes: Login, Signup, Landing (e.g., AnimatedHero)  
  • Protected routes: Dashboard, Menu Management, AI Suggestions, Settings  
- **Navigation**: Sidebar or top nav for primary sections; breadcrumbs for nested pages.  
- **Guards**: Redirect unauthenticated users to the Login page; show loading spinner during auth check.

## 7. Performance Optimization

- **Code Splitting**: Dynamic imports with React.lazy or Vite’s `import()` per route or heavy component.  
- **Lazy Loading**: Defer non-critical images, charts, and AI suggestion components until needed.  
- **Caching**: TanStack Query’s in-memory cache reduces redundant network calls.  
- **Asset Optimization**:  
  • Compress images and SVGs.  
  • Leverage browsers’ native image formats (WebP).  
- **Tree-Shaking**: Ensure unused code is removed at build time.  
- **Critical CSS**: Inline above-the-fold styles if needed for faster first paint.

## 8. Testing and Quality Assurance

### 8.1 Unit & Integration Testing
- **Tools**: Vitest + React Testing Library.  
- **Focus Areas**:  
  • Core components (Button, Input, Table)  
  • Form logic (React Hook Form + Zod validation)  
  • API clients (Supabase, AI service mocks)  
  • Hooks (custom hooks wrapping TanStack Query)

### 8.2 End-to-End (E2E) Testing
- **Suggested Tool**: Cypress or Playwright.  
- **Key Flows**:  
 1. Chef signup/login.  
 2. Adding/editing/deleting a dish.  
 3. Requesting and viewing AI recommendations.  
 4. Theme toggle and navigation.

### 8.3 Accessibility & Performance Audits
- **Tools**: Lighthouse (for performance), axe-core or Pa11y (for accessibility).  
- **Frequency**: Include in CI pipeline for early regression detection.

## 9. Conclusion and Overall Frontend Summary

The ai-menu-refresh-platform frontend is built on a modern React+Vite foundation, emphasizing modularity, performance, and developer productivity. Key takeaways:

- A clear **architecture** using React, Vite, TypeScript, Tailwind CSS, and TanStack Query.  
- **Design principles** that prioritize usability, accessibility, and responsiveness.  
- A **component-based** structure that promotes reuse and ease of maintenance.  
- **Robust state management**: server state with TanStack Query, client state with Context API and React hooks.  
- Planned **routing**, **performance optimizations**, and **comprehensive testing** to ensure reliability.

Unique aspects include the deep customization of `shadcn/ui` components, seamless AI integration readiness, and an extensible folder structure primed for feature growth. These guidelines align with the project’s goal: delivering a polished, scalable, and delightful platform for chefs to refresh their menus with AI-driven insights.

---

_End of Frontend Guidelines Document._