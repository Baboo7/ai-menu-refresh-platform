# Security Guidelines for ai-menu-refresh-platform

This document outlines security best practices tailored to the **ai-menu-refresh-platform** project. It aligns with industry standards and the core security principles of Security by Design, Least Privilege, Defense in Depth, and Secure Defaults.

---

## 1. Authentication & Access Control

- **Supabase Auth Configuration**
  - Enforce email verification and password strength (minimum length, complexity).
  - Enable Multi-Factor Authentication (MFA) for chef accounts performing sensitive actions.
  - Configure session lifetimes with both idle and absolute timeouts; revoke sessions on password change or logout.

- **Row-Level Security (RLS)**
  - Use Supabase’s RLS policies to ensure chefs can only read/write their own menu records.
  - Define explicit policies for each table (`menus`, `dishes`, `recommendations`) rather than disabling RLS globally.

- **Role-Based Access Control**
  - Define roles (e.g., `chef`, `admin`) in Supabase Auth metadata and enforce them in RLS policies.
  - Check roles server-side in any Edge Functions or serverless code before executing privileged operations.

---

## 2. Input Handling & Validation

- **Schema Validation**
  - Use Zod both client- and server-side (Edge Functions or Supabase Functions) to enforce strict typing and validation for all input (e.g., dish names, prices).
  - Never rely solely on client-side checks; always revalidate on the backend.

- **Injection Prevention**
  - Leverage Supabase’s parameterized queries or ORM abstractions to avoid SQL injection.
  - Sanitize any user-supplied strings before rendering them in React to prevent XSS.

- **File Upload Security** (if applicable)
  - Restrict file types (e.g., images only), size limits, and scan for malware.
  - Store uploads in a private Supabase Storage bucket and generate signed URLs for download.

---

## 3. Data Protection & Privacy

- **Encryption in Transit & At Rest**
  - Enforce HTTPS/TLS 1.2+ for all API calls (Supabase Auth, database, AI service).
  - Supabase data and storage buckets are encrypted at rest by default.

- **Secrets Management**
  - Store sensitive keys (`SUPABASE_URL`, `SUPABASE_KEY`, `AI_API_KEY`) in environment variables; do not commit `.env` files.
  - Consider using a secrets manager (e.g., AWS Secrets Manager, Vault) for production.

- **Minimal Data Exposure**
  - Return only the fields needed by the frontend (avoid leaking internal IDs, metadata).
  - Mask or redact any personally identifiable information (PII) in logs and error messages.

---

## 4. API & Service Security

- **CORS Configuration**
  - In Supabase Dashboard, restrict allowed origins to your deployed frontend domains.
  - In Vite’s development server, whitelist only `http://localhost:5173` (or your dev URL).

- **Rate Limiting & Throttling**
  - Implement rate limits on AI service calls (via Supabase Edge Functions or a proxy) to prevent abuse and excessive costs.
  - Consider using a CDN/WAF layer (e.g., Cloudflare) for global request throttling.

- **API Versioning & Methods**
  - Group backend logic in versioned Edge Functions (e.g., `/v1/menus`, `/v1/ai/recommend`).
  - Enforce correct HTTP verbs (GET for reads, POST for creation, PUT/PATCH for updates, DELETE for removals).

---

## 5. Web Application Security Hygiene

- **Security Headers**
  - Configure the following headers at the hosting or proxy layer:
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none';`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`

- **Cookie Security**
  - Set Supabase session cookies with `Secure`, `HttpOnly`, and `SameSite=Lax` or `Strict`.

- **CSRF Protection**
  - For any state-changing fetches outside of Supabase’s built-in JWT flows, implement anti-CSRF tokens or use double-submit cookie patterns.

- **Avoid Client-Side Secrets**
  - Never expose the AI service key or Supabase service role key in frontend code.
  - All privileged operations should be performed server-side.

---

## 6. Infrastructure & Configuration Management

- **Secure Defaults**
  - Disable debug flags and verbose logging in production builds (`vite build --mode production`).
  - Ensure repository branch protections and require pull-request reviews before merging.

- **Dependency Hygiene**
  - Maintain a `package-lock.json` or `yarn.lock` for deterministic builds.
  - Regularly run `npm audit` or `yarn audit` and update vulnerable packages.
  - Vet new dependencies for maintenance activity and CVE history.

- **Server Hardening & Monitoring**
  - If self-hosting any services (e.g., reverse proxies), disable unused ports and services.
  - Integrate error and performance monitoring (e.g., Sentry) to catch security incidents and anomalous usage patterns.

---

## 7. AI Integration Security Considerations

- **Edge Function Proxying**
  - Route all AI API requests through a Supabase Edge Function or your own serverless function to keep the `AI_API_KEY` hidden.

- **Prompt Sanitization**
  - Validate and escape any chef-provided menu data before embedding it in AI prompts to avoid injection of malicious content.

- **Response Handling**
  - Treat AI responses as untrusted; display them only after sanitization.
  - Enforce size limits on the response payload.

---

## 8. Monitoring, Logging & Incident Response

- **Audit Logging**
  - Log critical actions (login attempts, menu modifications, AI requests) with user identifiers and timestamps.
  - Store logs in a secure, write-once location (e.g., cloud logging service).

- **Alerting & Response**
  - Configure alerts for repeated failed logins, rate-limit breaches, or Edge Function errors.
  - Develop an incident response plan to revoke compromised keys, rotate secrets, and inform affected users.

---

By following these guidelines, the **ai-menu-refresh-platform** will maintain a robust security posture throughout its development and production lifecycle. Continuous review, testing, and adaptation to new threats are essential to preserving the trust of your chef users and safeguarding their data.