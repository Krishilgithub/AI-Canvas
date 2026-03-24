# 🏗️ AI Canvas: Backend & Database Architecture Guide

This document is a complete technical breakdown of the Node.js/TypeScript backend powering the AI Canvas platform. It outlines the core technologies, database models, and the exact purpose of every file within the backend source code.

---

## 🛠️ Technology Stack

* **Runtime & Framework**: **Node.js** with **Express.js** providing the REST API foundation.
* **Language**: **TypeScript** for strict type-safety and object interfaces.
* **Database & Auth**: **Supabase** (`@supabase/supabase-js`), an open-source Firebase alternative leveraging PostgreSQL. It handles Identity (OAuth), database storage, and Row Level Security.
* **AI & Machine Learning**:
  * **Google Gemini** (`@google/generative-ai`) for base LLM inference.
  * **LangChain & LangGraph** (`@langchain/google-genai`, `@langchain/langgraph`) to orchestrate complex, multi-step agentic workflows (Analyze \u2192 Draft \u2192 Format).
* **Real-time Engine**: **Socket.IO** to push live updates to the frontend React dashboard.
* **Cron & Background Jobs**: **Node-Cron** used to run scheduled tasks like auto-publishing and weekly digest emails.
* **Billing**: **Stripe** API for subscription quotas and SaaS billing.
* **Validation & Security**: **Zod** (Input schema validation), **Helmet** (HTTP headers), **Cors** (Cross-origin protection).

---

## 💾 Database Architecture (Supabase / PostgreSQL)

Based on the queries throughout the backend, the core relational schema consists of:

1. **`users` / `profiles`**: Core table storing user identities, SaaS `subscription_tier`, usage metrics, and customizable `notification_preferences`.
2. **`linked_accounts`**: Vital table for social media integrations. Safely stores encrypted OAuth access/refresh tokens for different `platform`s (LinkedIn, Twitter, Reddit, Slack, Instagram) linked to a `user_id`.
3. **`detected_trends`**: A repository of scraped internet trends/news (using NewsData API) mapped to specific topics. The AI scans this table to auto-generate relevant posts.
4. **`generated_posts`**: The primary operational queue. Holds the `content` of the posts, `ai_metadata` (target platform, tokens used), and tracks states via the `status` enum (`NEEDS_APPROVAL`, `SCHEDULED`, `PUBLISHED`, `FAILED`).
5. **`automation_configs`**: User preferences detailing global rules, such as `require_approval` before the system auto-publishes.
6. **`automation_logs`**: An auditing table tracking every single background action, API failure, and payload for historical debugging.

---

## 📂 File-by-File Codebase Directory

### Root & Configuration (`src/`)

* **[server.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/server.ts)**: The main entry point. Bootstraps the Express application, registers Global Middleware (CORS, Morgan logging, Helmet), mounts the Router endpoints, and attaches `Socket.IO` to the HTTP server for real-time pipes.
* **[db.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/db.ts)**: Initializes and exports the singleton Supabase client wrapper using credentials from [.env](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/.env).
* **[constants.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/constants.ts)**: Contains system-wide Typescript Enums (e.g., `PostStatus`, `Platform`) to prevent typo-based bugs.
* **[swagger.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/swagger.ts)**: Configures the automated OpenAPI documentation rendered via Swagger UI.

---

### Endpoints (`src/routes/`)

Routes connect HTTP paths (e.g. `GET /api/automation/posts`) to their respective Controller functions. They also enforce security by wrapping endpoints in the `requireAuth` middleware.

* **[auth.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/auth.routes.ts)**: Handles standard login/register limits, plus specialized OAuth callback handlers when users authorize third-party social integrations.
* **[automation.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/automation.routes.ts)**: The heaviest router. Houses endpoints for `/seed` (forcing manual trend generation), `/create-draft`, `/posts` (fetching history), and API integration connectivity `/connections`.
* **[analytics.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/analytics.routes.ts)**: Fetches aggregated numerical data for charting dashboard metrics.
* **[payment.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/payment.routes.ts)**: Hooks for generating Stripe checkout pages and listening to Stripe payment webhooks (to upgrade tiers).
* **[post.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/post.routes.ts)**: Basic CRUD routing for manually editing, deleting, or rescheduling specific posts.
* **[user.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/user.routes.ts)**: Endpoints for updating profile settings, onboarding steps, and fetching user contexts.

---

### Request Orchestration (`src/controllers/`)

Controllers handle the HTTP Request/Response bodies, execute logic, query the Database, and format JSON arrays for the frontend.

* **[automation.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts)**: The absolute engine of the project. Contains `scanTrends` (for mass-generating drafts based on news), `createDraft` (creating isolated posts), Webhook triggers, Quota Checkers, and automated Cron job functions.
* **[auth.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/auth.controller.ts)**: Manages Supabase Auth signup flows, JWT passing, and complex logic for saving external OAuth redirect scopes securely.
* **[analytics.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/analytics.controller.ts)**: Queries Supabase to count `PUBLISHED` vs `FAILED` posts over time and formats it for Recharts UI component consumption.
* **[payment.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/payment.controller.ts)**: Generates secure Stripe Sessions.
* **[user.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/user.controller.ts)**: Updates specific profile settings, onboarding states, and preferences in the database.

---

### External Integrations (`src/services/`)

Services abstract away all third-party complexity. Controllers blindly request tasks from Services so none of the API-specific messy networking leaks into the rest of the application.

* **AI & Planning**
  * **[workflow.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts)**: The complex brain of the post generator. It uses **LangGraph** to create a multi-step agent. It defines an [analyzeNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#25-44) (research context), [draftNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74) (write the post), and [formatNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#75-97) (clean it up and add hashtags). Features automatic exponential backoff/retries.
  * **[gemini.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/gemini.service.ts)**: Wrapper directly calling `@google/generative-ai` models to grade/score news trends based on `velocity_score` and `impact`.
* **Publishing Infrastructure**
  * **[twitter.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/twitter.service.ts)**, **[linkedin.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts)**, **[reddit.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/reddit.service.ts)**, **[instagram.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/instagram.service.ts)**, **[slack.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/slack.service.ts)**: Each service looks up the user's OAuth tokens from `linked_accounts` and executes HTTP POST requests formatting the specific API payload required by each network.
* **Infrastructure Operations**
  * **[scheduler.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts)**: The cron worker script. Loops through `generated_posts` where status is `SCHEDULED`, and if the time has passed, routes it to the specific social media service to be automatically published without user intervention.
  * **[email.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts)**: Configures Nodemailer to send users notifications when a post `NEEDS_APPROVAL`, weekly digests, or team invitations.
  * **[news.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/news.service.ts)**: Pings external news/RSS aggregators to feed into the AI.
  * **[socket.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/socket.service.ts)**: Wraps Socket.IO to cleanly emit frontend reload triggers when background async processes finish.
