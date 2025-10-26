# Project Requirements Document (PRD)

## 1. Project Overview

The AI Menu Refresh Platform is a web application designed to help professional and home chefs effortlessly update and enhance their restaurant menus using AI-driven recommendations. It’s built on a modern starter template (`ai-menu-refresh-platform`) that includes a React/Vite frontend, a customizable UI component library, and Supabase for authentication and database services. Chefs get a polished dashboard where they can add, edit, and organize menu items, then request AI suggestions to refresh recipes, tweak descriptions, or optimize pricing.

This platform is being built to streamline the repetitive work of menu planning and allow chefs to focus on creativity. Key objectives include: 1) delivering accurate, actionable AI recommendations; 2) providing a clear, responsive interface for menu management; and 3) ensuring a development environment that’s easy to extend and maintain. Success will be measured by adoption rates among chefs, the quality of AI suggestions, and system performance (page load times under 2 seconds, AI response times under 3 seconds).

## 2. In-Scope vs. Out-of-Scope

**In-Scope (First Version)**
- User sign-up, login, and password reset via Supabase Authentication
- Chef dashboard with a sidebar and main content area
- CRUD (Create, Read, Update, Delete) operations on menu items (dishes, ingredients, prices) with React Hook Form + Zod validation
- AI recommendation endpoint: send current menu data, receive suggestions, and display them in interactive cards
- Ability to accept AI suggestions and merge them into the existing menu
- Basic data visualization (using Recharts) for simple analytics (e.g., average dish price, cost breakdown)
- Light/dark theme toggle with `next-themes`
- Responsive design for desktop and tablet

**Out-of-Scope (Later Phases)**
- Payment processing or subscription management
- Multi-restaurant account collaboration or role-based access beyond basic chef user
- Mobile native apps (iOS/Android)
- Real-time chat or collaboration between chefs
- Advanced analytics dashboards (profit projections, ingredient trend forecasting)
- CI/CD pipelines, production monitoring, and deployment automation

## 3. User Flow

A new chef lands on the marketing landing page featuring an animated hero section describing the platform’s benefits. They click “Sign Up,” fill in their email and password, then verify their account via a confirmation link. Once signed in, they arrive on the main dashboard: a left sidebar lists navigation links (Dashboard, Menu, Analytics, Settings), and the central area shows their current menu in a sortable table.

From the menu page, the chef can click “Add Dish” to open a modal with a form for dish name, description, price, and ingredients. Form fields are validated instantly (e.g., price must be numeric). Upon saving, the new dish appears in the table. The chef then clicks “Get AI Suggestions,” which triggers a call to the AI service. Suggested dishes appear as cards below the table, each with a title, description, and price recommendation. The chef can click “Add to Menu” on any card to merge that suggestion into their menu entries.

## 4. Core Features

- **Authentication**: Sign up, login, password reset flows via Supabase Auth
- **Menu Management**: Dish list table with sorting and filtering, Add/Edit/Delete modal forms
- **AI Integration**: Service module for formatting prompts, sending menu data to OpenAI/Gemini/Claude, and handling responses
- **Interactive Cards**: Display AI-generated suggestions with an “Add to Menu” action
- **Data Fetching & Caching**: TanStack Query for seamless server state management (loading, error, refetch)
- **Form Handling & Validation**: React Hook Form paired with Zod schemas for reliable input
- **UI Components**: shadcn/ui components (forms, tables, dialogs, cards) styled by Tailwind CSS, animated with Framer Motion
- **Theming**: Light/dark mode toggle via `next-themes`
- **Analytics Charts**: Recharts for simple data visualizations (average price, cost breakdown)
- **Type Safety**: End-to-end TypeScript for components, services, and data models

## 5. Tech Stack & Tools

- **Frontend**
  - Framework: React 18
  - Bundler: Vite
  - Language: TypeScript
  - Styling: Tailwind CSS
  - UI Library: shadcn/ui (built on Radix UI)
  - Animations: Framer Motion
  - Icons: Lucide React
  - Data Fetching: TanStack Query
  - Forms: React Hook Form + Zod
  - Theming: next-themes
  - Charts: Recharts
- **Backend / BaaS**
  - Supabase: Authentication, Postgres database, real-time subscriptions
  - Supabase Edge Function (optional): Secure server-side AI calls
- **AI Service**
  - OpenAI GPT-4 (or Google Gemini / Anthropic Claude) via REST API
  - Prompt engineering module (`src/services/ai.ts`)
- **Developer Tools**
  - IDE: Visual Studio Code
  - Recommended Plugins: ESLint, Prettier, Tailwind CSS IntelliSense
  - Testing: Vitest + React Testing Library
  - Version Control: Git with GitHub

## 6. Non-Functional Requirements

- **Performance**: First contentful paint < 1.5 seconds; AI recommendation round-trip < 3 seconds
- **Scalability**: Support up to 5,000 menu entries without UI lag (use virtualization if needed)
- **Security**: API keys stored in `.env` files; AI calls via server or edge functions to avoid client exposure; Supabase Row-Level Security (RLS)
- **Reliability**: 99.9% uptime for core flows; retries on transient AI API failures
- **Accessibility**: Comply with WCAG 2.1 AA (keyboard navigation, ARIA labels)
- **Usability**: Intuitive forms with inline validation, clear loading/error states, and consistent UI patterns

## 7. Constraints & Assumptions

- The AI provider’s API key must be available and within rate limits for development and production
- Supabase free tier limits (e.g., 500 MB database, 2 GB bandwidth) are sufficient for initial usage
- Chefs will use modern browsers (latest Chrome, Safari, Firefox)
- No offline or mobile-native support in version 1
- Development and testing environments have stable internet and access to Supabase

## 8. Known Issues & Potential Pitfalls

- **API Rate Limits**: Hitting AI provider rate limits during peak usage. Mitigation: implement client-side caching of recent suggestions and exponential backoff retries.
- **Cold Start on Edge Functions**: Initial AI call might be slow. Mitigation: pre-warm functions or move AI calls to a dedicated microservice.
- **Large Menu Rendering**: Displaying thousands of dishes can cause UI lag. Mitigation: use windowing libraries (e.g., React Virtualized) for tables.
- **Schema Mismatches**: Evolving Zod schemas could break stored data. Mitigation: version your schemas and run migrations or use gradual validation.
- **Security Exposure**: Accidentally including API keys in client builds. Mitigation: enforce environment variable checks and review bundler outputs in CI.

---

This PRD is the single source of truth for the AI Menu Refresh Platform’s initial version. All future technical specifications—file structure, detailed frontend/backend design, UI guidelines—should align directly with these requirements.