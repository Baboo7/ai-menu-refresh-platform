# Backend Structure Document

This document outlines the backend setup for the AI Menu Refresh Platform. It explains how the system is organized, which services and tools are used, and why each choice supports a reliable, scalable, and secure application.

## 1. Backend Architecture

**Overall Design**
- We rely on Supabase as a Backend-as-a-Service (BaaS), which gives us PostgreSQL database, authentication, storage, real-time updates, and serverless functions in one bundle.
- Client applications (React/Vite) communicate directly with Supabase’s auto-generated RESTful endpoints and real-time channels.
- For AI calls, we use Supabase Edge Functions (Node.js) to safely handle API keys and heavy processing.

**Design Patterns and Frameworks**
- Service Layer Pattern: All database operations and AI integrations are wrapped in reusable service modules.
- Layered Architecture:
  • Presentation: React frontend / API clients
  • Business Logic: Edge Functions or service modules
  • Data Access: Supabase SDK / PostgREST
- Configuration via environment variables (.env), with clear separation of development and production settings.

**Scalability, Maintainability, Performance**
- Supabase’s managed infrastructure scales the database vertically and horizontally under the hood.
- Edge Functions run at the network edge, reducing latency for AI calls.
- Realtime features via websockets keep views in sync without polling.
- Strict typing with TypeScript ensures maintainable code across services.

## 2. Database Management

**Technology**
- Primary database: PostgreSQL (hosted by Supabase)
- Data access: Supabase JavaScript client and PostgREST API
- Optional file storage for images or attachments: Supabase Storage (built on object storage with CDN fronting)

**Data Structure & Practices**
- Use normalized tables for menus and dishes, with JSONB fields for flexible data like ingredient lists.
- Enable Row-Level Security (RLS) in Postgres to ensure each chef only reads/writes their own data.
- Continuous backups via Supabase’s automated backup schedules.
- Version control for schema changes (Supabase Migrations or SQL migration scripts).

## 3. Database Schema

**Overview in Plain Language**
- We have chefs (users) who own restaurants.
- Each restaurant can have multiple menus.
- Menus consist of multiple dishes; each dish has a name, description, price, and optional ingredient list.
- AI suggestions are generated per menu and stored for review.

**SQL Schema (PostgreSQL)**
```sql
-- Table: restaurants
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,                -- references auth.users
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: menus
CREATE TABLE public.menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: dishes
CREATE TABLE public.dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  ingredients jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Table: ai_suggestions
CREATE TABLE public.ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id uuid NOT NULL REFERENCES public.menus(id),
  suggestion_data jsonb NOT NULL,         -- full AI response
  status text DEFAULT 'pending',         -- pending, completed, failed
  created_at timestamp with time zone DEFAULT now()
);

-- Row-Level Security Example (enable only matching owner)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can access own restaurants"
  ON public.restaurants FOR ALL
  USING (owner_id = auth.uid());
```  

## 4. API Design and Endpoints

**Approach**
- We leverage Supabase’s RESTful API (PostgREST) for all standard CRUD operations on tables.
- Custom actions (like AI suggestion generation) are handled by Supabase Edge Functions.

**Key Endpoints**
- **Authentication**
  • POST /auth/v1/signup     → create chef account
  • POST /auth/v1/signin     → log in and retrieve JWT

- **Restaurant & Menu Management**
  • GET /rest/v1/restaurants?owner_id=eq.{uid}        → list a chef’s restaurants
  • POST /rest/v1/restaurants                       → create new restaurant
  • GET /rest/v1/menus?restaurant_id=eq.{rid}        → list menus of a restaurant
  • POST /rest/v1/menus                              → add a new menu

- **Dish Management**
  • GET /rest/v1/dishes?menu_id=eq.{mid}            → get dishes for a menu
  • POST /rest/v1/dishes                            → add a dish
  • PATCH /rest/v1/dishes?id=eq.{dish_id}           → update a dish
  • DELETE /rest/v1/dishes?id=eq.{dish_id}          → remove a dish

- **AI Suggestions**
  • POST /functions/v1/generate-ai-suggestions      → trigger AI call (Edge Function)
  • GET /rest/v1/ai_suggestions?menu_id=eq.{mid}    → fetch stored suggestions

## 5. Hosting Solutions

**Backend Hosting**  
- Supabase Cloud platform hosts both our PostgreSQL database and Edge Functions.  
- No self-managed servers reduce maintenance overhead.

**Benefits**
- **Reliability:** Supabase offers uptime SLAs, automated failover, and daily backups.  
- **Scalability:** Database auto-scales and serverless functions scale on demand.  
- **Cost-Effectiveness:** Pay-as-you-grow pricing ensures small teams start cheap and only pay for added usage.

## 6. Infrastructure Components

**Load Balancing**
- Supabase Gateway manages traffic across database replicas and edge functions.

**Caching**
- Supabase CDN caches static storage assets (images, JSON files) at the edge.  
- HTTP caching headers are configurable via Supabase Storage policies.

**Content Delivery Network (CDN)**
- Supabase automatically serves storage assets (e.g., dish images) through a global CDN.  
- Optional: Use a custom CDN (Cloudflare) in front of Supabase for advanced caching rules.

**Realtime Channels**
- Built-in websockets push updates (e.g., new dishes or AI suggestions) to connected clients instantly.

## 7. Security Measures

**Authentication & Authorization**
- Supabase Auth handles sign-up, sign-in, password recovery, and third-party OAuth.  
- JSON Web Tokens (JWT) secure all requests; RLS policies enforce per-user access.

**Data Encryption**
- SSL/TLS enforced for all data in transit.  
- Data at rest encrypted by Supabase’s managed PostgreSQL.

**API Key Protection**
- AI service API keys stored only in Edge Function environment variables.  
- No keys are exposed to the client.

**Database Security**
- Row-Level Security ensures chefs see only their own records.  
- Regular security audits and least-privilege principle for service roles.

## 8. Monitoring and Maintenance

**Monitoring Tools**
- Supabase Dashboard: real-time metrics (connections, query performance, errors).  
- Logs exported to external logging services (e.g., Datadog, Logflare) via direct integration.

**Alerts**
- CPU, memory, and error rate thresholds configured in Supabase or via third-party tools.  
- Notifications sent to Slack or email when anomalies occur.

**Maintenance Strategies**
- Automated daily backups with a 7-day retention policy.  
- Schema changes managed via version-controlled migration scripts.  
- Dependency updates (Edge Function libraries) on a monthly schedule.

## 9. Conclusion and Overall Backend Summary

The backend for the AI Menu Refresh Platform is built on a cloud-native, fully managed stack, centered on Supabase’s PostgreSQL, Auth, Storage, and Edge Functions. This setup:

- Streamlines development by providing out-of-the-box CRUD APIs.  
- Ensures data integrity and security through Row-Level Security and JWT.  
- Delivers real-time updates and low latency via websockets and edge computing.  
- Scales automatically with growing usage without manual provisioning.  
- Keeps AI integration secure and maintainable inside serverless functions.

By combining these components, the platform meets chef users’ needs for quick menu management, trustworthy data handling, and powerful AI recommendations, all wrapped in a reliable, performant backend that supports current requirements and future growth.