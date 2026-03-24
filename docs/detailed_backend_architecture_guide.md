# Backend Architecture Documentation

## 1. Overview

AI Canvas is an **AI-powered cross-platform content automation SaaS**. The backend is built as a **monolithic Node.js/Express REST API** written in **TypeScript** that orchestrates:

1. **Trend Detection** — Scrapes news APIs, then uses Google Gemini to score and rank trending topics.
2. **AI Content Generation** — A multi-step **LangGraph** agentic pipeline (Analyze → Draft → Format) generates platform-optimized social media posts.
3. **Multi-Platform Publishing** — OAuth-connected services publish to LinkedIn, Twitter/X, Reddit, Instagram, and Slack.
4. **Scheduling & Automation** — Cron jobs auto-publish scheduled posts and send weekly digest emails.
5. **Real-time Collaboration** — Socket.IO enables live post editing, typing indicators, and instant notifications.
6. **Billing & Quotas** — Stripe integration manages subscriptions with per-tier post generation limits.

### How the Backend Connects to Other Systems

```
┌──────────────┐    REST API     ┌──────────────────┐   Supabase Client   ┌──────────────────┐
│  Next.js     │ ◄────────────► │  Express Backend  │ ◄────────────────► │  PostgreSQL      │
│  Frontend    │   Socket.IO    │  (Node.js + TS)   │                    │  (via Supabase)  │
└──────────────┘                └────────┬─────────┘                    └──────────────────┘
                                         │
                    ┌────────────┬────────┴────────┬─────────────┬──────────────┐
                    ▼            ▼                 ▼             ▼              ▼
              ┌──────────┐ ┌──────────┐    ┌───────────┐ ┌──────────┐  ┌───────────┐
              │ Gemini   │ │ NewsData │    │ LinkedIn  │ │ Twitter  │  │  Stripe   │
              │ AI / LG  │ │ API      │    │ API       │ │ API v2   │  │  Billing  │
              └──────────┘ └──────────┘    └───────────┘ └──────────┘  └───────────┘
```

---

## 2. Tech Stack Explanation

| Technology | Why It's Used |
|---|---|
| **Node.js** | Non-blocking I/O ideal for handling many concurrent API calls to social platforms and AI services |
| **Express.js** | Lightweight, mature HTTP framework with rich middleware ecosystem (CORS, Helmet, Morgan) |
| **TypeScript** | Catches type errors at compile-time; enums prevent status/platform string typos |
| **Supabase (PostgreSQL)** | Provides managed PostgreSQL + built-in JWT auth + Row Level Security. No separate auth server needed |
| **LangChain + LangGraph** | Orchestrates a multi-step AI agent graph (Analyze → Draft → Format) with state management and automatic LangSmith tracing |
| **Google Gemini** | Primary LLM for both trend analysis scoring and content generation |
| **Socket.IO** | Real-time bidirectional communication for live post collaboration and instant dashboard updates |
| **Stripe** | Industry-standard subscription billing with webhook-driven payment state management |
| **Node-Cron** | Lightweight cron scheduler for auto-publishing posts and sending weekly digest emails |
| **Zod** | Runtime schema validation for all API request bodies, queries, and params |
| **Nodemailer** | Flexible email transport supporting SMTP in production and console logging in dev |
| **Axios** | Promise-based HTTP client used for all external API calls (LinkedIn, Reddit, Instagram, Slack, News) |
| **Helmet** | Sets security-related HTTP headers (CSP, X-Frame, etc.) |
| **Morgan** | HTTP request logger for development debugging |
| **Swagger (OpenAPI 3.0)** | Auto-generated API documentation from JSDoc annotations |

---

## 3. Folder Structure

```
backend/
├── package.json              # Dependencies & scripts (dev, build, start)
├── tsconfig.json             # TypeScript compiler configuration
└── src/
    ├── server.ts             # 🚀 Application entry point — boots Express, Socket.IO, Cron
    ├── db.ts                 # 🗄️ Supabase client singleton
    ├── constants.ts          # 📋 TypeScript Enums (Platform, PostStatus, LogLevel)
    ├── swagger.ts            # 📖 OpenAPI/Swagger configuration
    │
    ├── middleware/            # 🛡️ Express middleware layer
    │   ├── auth.middleware.ts        # JWT validation via Supabase
    │   ├── error.middleware.ts       # Global error handler
    │   └── validation.middleware.ts  # Zod schema validation
    │
    ├── schemas/               # 📐 Zod validation schemas
    │   ├── automation.schema.ts     # Schemas for config, trends, drafts, posts
    │   └── post.schema.ts           # Schemas for post CRUD operations
    │
    ├── routes/                # 🛣️ HTTP route definitions
    │   ├── auth.routes.ts           # OAuth connect/callback/disconnect per platform
    │   ├── automation.routes.ts     # Core automation: scan, draft, post, config, team
    │   ├── analytics.routes.ts      # Dashboard metrics & stats
    │   ├── payment.routes.ts        # Stripe checkout & webhooks
    │   ├── post.routes.ts           # Post CRUD
    │   └── user.routes.ts           # Profile & subscription management
    │
    ├── controllers/           # 🎮 Request handlers (business logic)
    │   ├── automation.controller.ts # ⭐ Core engine (1226 lines) — trends, drafts, posting, team, cron
    │   ├── auth.controller.ts       # OAuth flows for 5 platforms + generic fallback
    │   ├── analytics.controller.ts  # Dashboard overview, activity feed, platform stats
    │   ├── payment.controller.ts    # Stripe session creation & webhook handling
    │   ├── post.controller.ts       # Post list/get/update/delete
    │   └── user.controller.ts       # Profile CRUD, API key generation, subscription
    │
    └── services/              # ⚙️ External integration abstractions
        ├── workflow.service.ts      # 🧠 LangGraph AI pipeline (Analyze→Draft→Format)
        ├── gemini.service.ts        # 🤖 Gemini trend intelligence analyzer
        ├── linkedin.service.ts      # OAuth + UGC Posts API publishing
        ├── twitter.service.ts       # OAuth2 PKCE + tweet.write API
        ├── reddit.service.ts        # OAuth + self-post submission
        ├── instagram.service.ts     # Graph API container publishing
        ├── slack.service.ts         # OAuth + chat.postMessage / webhooks
        ├── scheduler.service.ts     # ⏰ Cron: auto-publish + weekly digest
        ├── email.service.ts         # 📧 Nodemailer: approval, digest, invite emails
        ├── news.service.ts          # 📰 NewsData.io trend fetcher
        ├── stripe.service.ts        # 💳 Checkout sessions + webhook handler
        └── socket.service.ts        # 🔌 Real-time collaboration engine
```

---

## 4. File-by-File Explanation

### File: [src/server.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/server.ts)

**Purpose:** Application bootstrap — creates the Express app, registers all middleware and routes, initializes Socket.IO and the scheduler, and starts the HTTP server.

**Key Functions / Logic:**
- Loads environment variables via `dotenv.config()`
- Configures CORS with a dynamic origin allowlist (localhost + Vercel production domain)
- Captures `rawBody` in the JSON parser middleware for Stripe webhook signature verification
- Conditionally starts the scheduler and Socket.IO only when NOT running on Vercel serverless (`process.env.VERCEL !== "1"`)
- Mounts 6 route groups under `/api/v1/` and Swagger docs at `/api-docs`
- Provides a `/health` endpoint for uptime monitoring
- Exports `app` for Vercel serverless function entry

**How it Connects:**
- Imports all 6 route modules and wires them to namespaced URL prefixes
- Imports `schedulerService` and calls `.start()` for cron jobs
- Imports `socketService` and calls `.init()` to attach Socket.IO to the HTTP server
- Registers the global [errorHandler](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/error.middleware.ts#3-15) middleware as the final catch-all

**Important Notes:**
- The **Vercel guards** (`process.env.VERCEL !== "1"`) are a critical design pattern; they prevent long-running processes (cron, sockets) from crashing on serverless. Instead, Vercel Cron routes trigger the same logic via HTTP.

---

### File: [src/db.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/db.ts)

**Purpose:** Creates and exports a singleton Supabase client using the **service role key** (backend-only, bypasses Row Level Security).

**Key Functions / Logic:**
- Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env
- Falls back to placeholder values with console warnings if not configured
- Exports `supabase` — used by every controller and service for database operations

**How it Connects:**
- Imported by every controller and most services
- Uses the **service role key** (not the anon key) so the backend can read/write all rows regardless of RLS policies

**Important Notes:**
- The service role key must NEVER be exposed to the frontend. It bypasses all Supabase security policies.

---

### File: [src/constants.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/constants.ts)

**Purpose:** Type-safe enums that prevent string-based bugs across the codebase.

**Key Enums:**
- `Platform` — `linkedin`, `twitter`, `youtube`, `slack`
- `PostStatus` — [draft](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74), `needs_approval`, `approved`, `scheduled`, `published`, `rejected`, `failed`
- `LogLevel` — [info](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/tsconfig.tsbuildinfo), `warning`, [error](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/error.middleware.ts#3-15), [success](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/linkedin/content-approval.tsx#134-138)

**How it Connects:**
- Used in [automation.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts) for status transitions and platform routing
- Referenced in scheduler and service files for conditional logic

---

### File: [src/swagger.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/swagger.ts)

**Purpose:** Configures OpenAPI 3.0 documentation using `swagger-jsdoc`.

**Key Functions / Logic:**
- Defines the API title, version, and server URL
- Configures `bearerAuth` security scheme for JWT documentation
- Scans all `routes/*.ts` and `controllers/*.ts` for JSDoc annotations

**How it Connects:**
- Exported `swaggerSpec` is mounted as Swagger UI at `/api-docs` in [server.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/server.ts)

---

### File: [src/middleware/auth.middleware.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/auth.middleware.ts)

**Purpose:** JWT authentication guard. Validates the user's Supabase access token and attaches the user object to the request.

**Key Functions / Logic:**
- [requireAuth](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/auth.middleware.ts#8-37) — Extracts Bearer token from `Authorization` header → calls `supabase.auth.getUser(token)` → attaches `req.user` or returns 401
- Exports [AuthRequest](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/auth.middleware.ts#4-7) interface extending Express [Request](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/auth.middleware.ts#4-7) with optional `user` field

**How it Connects:**
- Wrapped around nearly every route (except OAuth callbacks and Stripe webhooks)
- All controllers read `req.user.id` to scope database queries to the authenticated user

**Important Notes:**
- Uses Supabase's own JWT verification — no custom JWT library needed
- The `user` object includes [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153), `email`, and other Supabase auth metadata

---

### File: [src/middleware/error.middleware.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/error.middleware.ts)

**Purpose:** Global Express error handler — catches all unhandled errors and returns a standardized JSON response.

**Key Functions / Logic:**
- Logs the full error to console
- Returns `{ success: false, error: message }`
- Includes `stack` trace only in non-production environments

---

### File: [src/middleware/validation.middleware.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/validation.middleware.ts)

**Purpose:** Generic Zod validation middleware factory.

**Key Functions / Logic:**
- [validate(schema)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/validation.middleware.ts#4-25) — Returns middleware that parses `{ body, query, params }` against a Zod schema
- On validation failure, returns 400 with field-level error details
- On success, calls `next()` to continue the chain

**How it Connects:**
- Used in [automation.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/automation.routes.ts) and other route files to validate request payloads before they reach controllers

**Important Notes:**
- **Design Pattern: Schema-first validation** — Separates validation logic from business logic. Schemas are defined in `/schemas/` and composed into routes declaratively.

---

### File: [src/schemas/automation.schema.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/schemas/automation.schema.ts)

**Purpose:** Zod schemas for all automation-related API endpoints.

**Key Schemas:**
- `saveConfigSchema` — Validates niches (min 1), keywords, tone_profile, schedule_cron, platform
- `scanTrendsSchema` — Optional user_id (prefers auth token)
- `createDraftSchema` — Requires `trend_id`, optional content
- `triggerPostSchema` — Requires valid UUID `post_id`
- `getConfigSchema` — Optional user_id query param
- `getPostsSchema` — Status enum filter, pagination (page, limit)

---

### File: [src/schemas/post.schema.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/schemas/post.schema.ts)

**Purpose:** Zod schemas for manual post CRUD operations.

**Key Schemas:**
- `updatePostSchema` — UUID param [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153), optional content/scheduled_time/media_urls/status
- `createPostSchema` — Required content (min 1 char), optional status (defaults to [draft](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74))

---

### File: [src/routes/auth.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/auth.routes.ts)

**Purpose:** Defines OAuth endpoints for 5 social platforms plus a generic fallback.

**Key Endpoints:**
| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/linkedin/connect` | ✅ | Generates LinkedIn OAuth URL |
| GET | `/linkedin/callback` | ❌ | Handles LinkedIn OAuth redirect |
| DELETE | `/linkedin` | ✅ | Disconnects LinkedIn account |
| GET | `/twitter/connect` | ✅ | Generates Twitter OAuth2 PKCE URL |
| GET | `/twitter/callback` | ❌ | Exchanges Twitter code for tokens |
| DELETE | `/twitter` | ✅ | Disconnects Twitter |
| GET | `/instagram/connect` | ✅ | Instagram OAuth URL |
| GET | `/instagram/callback` | ❌ | Exchanges IG code, gets long-lived token |
| DELETE | `/instagram` | ✅ | Disconnects Instagram |
| GET | `/slack/connect` | ✅ | Slack OAuth URL |
| GET | `/slack/callback` | ❌ | Exchanges Slack code for bot token |
| DELETE | `/slack` | ✅ | Disconnects Slack |
| GET | `/reddit/connect` | ✅ | Reddit OAuth URL |
| GET | `/reddit/callback` | ❌ | Exchanges Reddit code |
| DELETE | `/reddit` | ✅ | Disconnects Reddit |
| GET | `/:platform/connect` | ✅ | Generic fallback for unsupported platforms |
| GET | `/:platform/callback` | ❌ | Generic callback handler |
| DELETE | `/:platform` | ✅ | Generic disconnect |

**Important Notes:**
- Callbacks are NOT auth-protected because the user's browser is redirected by the third-party OAuth provider — the user_id is encoded in the `state` parameter (Base64-encoded JSON).

---

### File: [src/routes/automation.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/automation.routes.ts)

**Purpose:** The largest route file — maps all core automation endpoints.

**Key Endpoints:**
| Method | Path | Auth | Validation | Handler |
|---|---|---|---|---|
| POST | `/config` | ✅ | `saveConfigSchema` | Save automation config |
| GET | `/config` | ✅ | `getConfigSchema` | Get automation config |
| GET | `/trends` | ✅ | — | List detected trends (paginated) |
| POST | `/scan` | ✅ | — | Trigger trend scanning + AI analysis |
| POST | `/create-draft` | ✅ | `createDraftSchema` | Generate AI draft from trend |
| GET | `/posts` | ✅ | `getPostsSchema` | List posts (filtered, paginated) |
| PUT | `/posts/:id` | ✅ | `updatePostSchema` | Edit a draft |
| POST | `/posts` | ✅ | `createPostSchema` | Create manual post |
| DELETE | `/posts/:id` | ✅ | — | Delete post |
| POST | `/posts/:id/retry` | ✅ | — | Retry failed post |
| POST | `/trigger-post` | ✅ | `triggerPostSchema` | Publish a post |
| POST | `/seed` | ✅ | — | Seed trends (dev tool) |
| POST | `/generate-manual` | ✅ | — | Manual AI generation |
| GET | `/quota` | ✅ | — | Check generation quota |
| GET | `/analytics` | ✅ | — | Get analytics data |
| GET | `/analytics/export` | ✅ | — | Export analytics as CSV |
| GET | `/logs` | ✅ | — | Get automation logs |
| GET | `/profile` | ✅ | — | Get user profile |
| POST | `/profile` | ✅ | — | Update profile |
| GET | `/connections` | ✅ | — | Get connected platforms |
| GET | `/team` | ✅ | — | List team members |
| POST | `/team/invite` | ✅ | — | Invite team member |
| DELETE | `/team/:id` | ✅ | — | Remove team member |
| GET | `/cron/process-posts` | CRON_SECRET | — | Vercel cron: process posts |
| GET | `/cron/weekly-digest` | CRON_SECRET | — | Vercel cron: weekly digest |

---

### File: [src/routes/analytics.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/analytics.routes.ts)

**Purpose:** Analytics dashboard endpoints.

**Key Endpoints:**
| Method | Path | Handler |
|---|---|---|
| GET | `/overview` | Total posts, scheduled count, reach, engagement |
| GET | `/activity` | Last 5 posts as activity feed |
| GET | `/stats` | Last 30 days of daily platform stats |

---

### File: [src/routes/payment.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/payment.routes.ts)

**Key Endpoints:**
| Method | Path | Auth | Handler |
|---|---|---|---|
| POST | `/create-checkout-session` | ✅ | Create Stripe checkout URL |
| POST | `/webhook` | ❌ (Stripe signature) | Handle Stripe webhook events |

---

### File: [src/routes/post.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/post.routes.ts)

**Key Endpoints:**
| Method | Path | Handler |
|---|---|---|
| GET | `/` | List all user posts |
| GET | [/:id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | Get single post |
| PUT | [/:id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | Update post |
| DELETE | [/:id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | Delete post |

---

### File: [src/routes/user.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/user.routes.ts)

**Key Endpoints:**
| Method | Path | Handler |
|---|---|---|
| GET | `/profile` | Get user profile (API key masked) |
| POST | `/profile` | Update profile fields |
| POST | `/profile/api-key` | Generate new API key (`sk_live_...`) |
| GET | `/profile/subscription` | Get subscription plan details |

---

### File: [src/controllers/automation.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts) (⭐ 1226 lines — Core Engine)

**Purpose:** The central orchestrator of the entire platform. Handles trend scanning, AI draft generation, multi-platform publishing, quota enforcement, team management, analytics, cron scheduling, and profile/connection management.

**Key Functions / Logic:**

- **`checkQuota(user_id)`** — Reads user's `subscription_tier` from DB, counts posts created this calendar month, compares against plan limits (`free: 10`, `pro: 200`, `enterprise: ∞`). Returns `{ allowed, used, limit, tier }`.

- **`saveConfig(req, res)`** — Upserts an `automation_configs` row for the given user+platform combination. Stores niches, keywords, tone_profile, schedule_cron, require_approval.

- **`scanTrends(req, res)`** — The trend-to-draft pipeline:
  1. Reads user's config (niches, keywords) from `automation_configs`
  2. Builds a search query and fetches news from [NewsService](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/news.service.ts#5-47)
  3. Sends raw articles to `GeminiService.analyzeTrendIntelligence()` for AI scoring
  4. Saves scored trends to `detected_trends` table
  5. Auto-generates drafts for high-impact trends (velocity_score > 70) via `WorkflowService.generatePost()`
  6. Includes a **3.5s throttle delay** between generations to respect Gemini free-tier rate limits

- **`createDraft(req, res)`** — Creates a single AI-generated post:
  1. Checks quota via `checkQuota()`
  2. If no content provided, fetches trend from DB and generates via `workflowService`
  3. Checks `automation_configs.require_approval` to set initial status
  4. Inserts post into `generated_posts`
  5. Sends approval email if user has `notification_preferences.post_approval` enabled
  6. Logs action to `automation_logs`

- **`triggerPost(req, res)`** — Publishes a post to the target platform:
  1. Fetches post and verifies ownership
  2. Routes to correct service based on `ai_metadata.platform` (LinkedIn/Twitter/Reddit/Instagram/Slack)
  3. Updates status to `published` with `platform_post_id` and `published_at`
  4. On failure: marks post as `failed` and logs error

- **`generateManualPost(req, res)`** — Direct AI generation without trend scanning. Accepts topic, platform, voice_preset, length, professionalism, etc. Calls `workflowService.generatePost()` with full parameter set.

- **`retryPost(req, res)`** — Re-attempts publishing a failed post.

- **`getPosts(req, res)`** — Paginated post listing with multi-status filtering (`status=published,failed`) and JSONB platform filtering via `contains()`.

- **`getConnections(req, res)`** — Reads all `linked_accounts` for the user, normalizing `status`/`connection_status` fields.

- **`processCronJobs(req, res)`** / **`processWeeklyDigestCron(req, res)`** — Vercel cron endpoints authenticated via `CRON_SECRET` header. Delegate to `schedulerService` methods.

- **`seedData(req, res)`** — Dev tool that delegates to `scanTrends` if `NEWSDATA_API_KEY` is present.

- **Team Management:** `getTeamMembers`, `inviteTeamMember` (sends email + creates pending record), `removeTeamMember`

- **Analytics:** `getAnalytics` (aggregated by date), `exportAnalytics` (CSV download), `getDashboardStats` (pending approvals, published this week)

**How it Connects:**
- Imports ALL services: LinkedIn, Twitter, Instagram, Slack, Reddit, News, Gemini, Workflow, Email, Scheduler
- Directly queries 7 tables: `users`, `profiles`, `automation_configs`, `detected_trends`, `generated_posts`, `automation_logs`, `team_members`, `linked_accounts`, `analytics_daily`

**Important Notes:**
- **Design Pattern: Service Layer Abstraction** — The controller never makes raw HTTP calls. All external API interaction is delegated to service classes.
- **Design Pattern: Quota Guard** — Every generation endpoint checks quotas before proceeding, preventing abuse.
- **Design Pattern: Optimistic Locking** — The scheduler uses `.eq("status", "scheduled")` as a guard clause when updating to `in_progress` to prevent double-processing.

---

### File: [src/controllers/auth.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/auth.controller.ts)

**Purpose:** Manages OAuth2 flows for 5 social platforms.

**Key Functions / Logic:**

For each platform (LinkedIn, Twitter, Instagram, Slack, Reddit), three methods follow the same pattern:

1. **`get[Platform]AuthUrl`** — Encodes `user_id` into a Base64 `state` parameter, calls the corresponding service's [getAuthUrl(state)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/instagram.service.ts#13-27), returns the URL to the frontend.

2. **`handle[Platform]Callback`** — Receives `code` and `state` from the OAuth redirect, decodes the `user_id` from `state`, calls the service's [connectAccount()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts#23-53) or [exchangeCodeForToken()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/slack.service.ts#26-75), redirects the browser to `/integrations?success=...`.

3. **`disconnect[Platform]`** — Deletes the row from `linked_accounts` where `user_id` and `platform` match.

- **Generic fallback handlers** (`connectPlatform`, `handlePlatformCallback`, `disconnectPlatform`) exist for unsupported platforms, using mock tokens.

**Important Notes:**
- **Security Pattern:** The `state` parameter carries the user_id through the OAuth redirect. In production, this should be cryptographically signed (HMAC) to prevent tampering.
- Twitter's callback uniquely passes `codeVerifier` (PKCE flow) inside the state payload.

---

### File: [src/controllers/analytics.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/analytics.controller.ts)

**Purpose:** Provides dashboard metrics.

**Key Functions:**
- `getOverview` — Counts total posts, scheduled posts, sums impressions and engagement from `analytics_daily`
- `getRecentActivity` — Returns last 5 posts formatted as activity feed items
- `getPlatformStats` — Returns last 30 days of raw `analytics_daily` data for chart rendering

---

### File: [src/controllers/payment.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/payment.controller.ts)

**Purpose:** Stripe integration bridge.

**Key Functions:**
- [createSession](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/payment.controller.ts#8-23) — Creates a Stripe Checkout Session for subscription payments, embedding `userId` in metadata
- [webhook](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/payment.controller.ts#24-39) — Validates Stripe webhook signature using `rawBody`, delegates to [handleWebhook()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/stripe.service.ts#47-85) in stripe.service

---

### File: [src/controllers/post.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/post.controller.ts)

**Purpose:** Basic CRUD for the `posts` table.

**Key Functions:**
- `listPosts` — Filtered by platform and status, ordered by creation date
- `getPost` — Single post by ID (scoped to user)
- `deletePost` — Soft-delete by user-owned ID
- `updatePost` — Partial update with user ownership check

---

### File: [src/controllers/user.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/user.controller.ts)

**Purpose:** User profile and subscription management.

**Key Functions:**
- [getProfile](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts#10-11) — Returns profile with **masked API key** (first 8 + last 4 chars visible)
- `updateProfile` — Updates name, bio, notification_preferences
- `generateApiKey` — Generates `sk_live_` prefixed key using `crypto.randomBytes(24)`. Returns raw key only once.
- `getSubscription` — Returns plan, status, and next billing date from profiles table

---

### File: [src/services/workflow.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts) (🧠 AI Brain)

**Purpose:** The LangGraph-based multi-step content generation pipeline.

**Key Functions / Logic:**

- **State Definition** — Uses LangGraph `Annotation.Root` to define typed workflow state: `topic`, `platform`, `userContext`, `parameters`, `insight`, [draft](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74), `finalPost`

- **[analyzeNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#25-44)** — Gemini 2.5 Flash (temp=0.7). Takes the topic and generates a 1-2 sentence social media strategy.

- **[draftNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74)** — Gemini 2.5 Flash (temp=0.8). Uses author context (role, bio, goals, voice preset) to ghostwrite the post. Does NOT include hashtags.

- **[formatNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#75-97)** — Gemini 2.5 Flash (temp=0.3). Conditionally adds 3-5 relevant hashtags if `automated_hashtags` or `auto_generate_tags` is enabled.

- **Graph Compilation** — `START → analyze → generateDraft → format → END`. Compiled into `postGenerationWorkflow`.

- **`WorkflowService.generatePost()`** — Entry point called by controllers. Invokes the compiled graph with initial state, returns `finalPost` or [draft](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74).

**Important Notes:**
- All 3 nodes use `maxRetries: 3` for resilience against rate limits.
- Automatic LangSmith tracing when `LANGCHAIN_TRACING_V2` env var is set.

---

### File: [src/services/gemini.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/gemini.service.ts) (🤖 Trend Intelligence)

**Purpose:** AI-powered trend analysis using raw Google Gemini API.

**Key Functions:**

- **[analyzeTrendIntelligence(input)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/gemini.service.ts#57-203)** — The advanced analyzer. Sends a detailed system prompt to Gemini with:
  - User's genre, keywords, target platform
  - Raw news article data
  - Analysis rules (relevance filtering, deduplication, engagement analysis, platform sensitivity)
  - Returns max 5 trends ranked by `impact_score` (0-1) with engagement signals, reasoning, and suggested angles

- **[analyzeTrendPotential(articles)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/gemini.service.ts#204-246)** — Legacy simpler analyzer for backward compatibility

- **[generateDraft(topic, context, userContext)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/gemini.service.ts#268-304)** — Direct Gemini draft generation (used as fallback if LangGraph workflow fails)

- **[fallbackAnalysis(articles, genre)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/gemini.service.ts#247-267)** — Random scoring when Gemini API is unavailable

**Important Notes:**
- Uses `gemini-2.0-flash` for trend analysis (different from `gemini-2.5-flash` used in workflow nodes)
- Strict JSON output parsing with markdown fence cleanup

---

### File: [src/services/linkedin.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts)

**Purpose:** LinkedIn OAuth and UGC Posts API publishing.

**Key Functions:**
- [getAuthUrl(state)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/instagram.service.ts#13-27) — Builds LinkedIn OAuth2 URL with `openid profile w_member_social email` scopes
- [connectAccount(userId, authCode)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts#23-53) — Exchanges code for token, fetches `/v2/userinfo`, stores in `linked_accounts` with `onConflict` upsert
- [createPost(userId, content)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts#66-80) — Fetches stored token, calls `/v2/ugcPosts` with UGC Share format. Handles duplicate content errors gracefully.

**Important Notes:**
- **Design Pattern: Strategy/Factory** — Exports either [RealLinkedInService](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts#83-233) or [MockLinkedInService](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts#18-81) based on `USE_REAL_LINKEDIN` env var. Mock service simulates delays and returns fake post IDs.

---

### File: [src/services/twitter.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/twitter.service.ts)

**Purpose:** Twitter/X OAuth2 PKCE flow and tweet posting.

**Key Functions:**
- [getAuthUrl(state)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/instagram.service.ts#13-27) — Uses `twitter-api-v2` library to generate OAuth2 auth link with PKCE `codeVerifier`. Embeds the verifier in the Base64 state payload.
- [exchangeCodeForToken(code, codeVerifier, userId)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/slack.service.ts#26-75) — Exchanges code+verifier for tokens via `loginWithOAuth2()`, stores in DB
- [postTweet(userId, content)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/twitter.service.ts#75-122) — Creates a user client with stored token, posts via `.v2.tweet()`. On 401, automatically refreshes the token and retries.

---

### File: [src/services/reddit.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/reddit.service.ts)

**Purpose:** Reddit OAuth and self-post submission.

**Key Functions:**
- [getAuthUrl(state)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/instagram.service.ts#13-27) — Reddit OAuth with `identity submit` scopes and `permanent` duration (for refresh token)
- [exchangeCodeForToken(code, userId)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/slack.service.ts#26-75) — Basic Auth with client_id:secret, fetches `/api/v1/me` for username
- [refreshAccessToken(userId, currentRefreshToken)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/reddit.service.ts#84-111) — Handles token refresh, updates DB
- [postToReddit(userId, content)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/reddit.service.ts#112-161) — Checks token expiry, refreshes if needed, submits self-post to `/api/submit` with `resubmit=true`

---

### File: [src/services/instagram.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/instagram.service.ts)

**Purpose:** Instagram Basic Display + Graph API integration.

**Key Functions:**
- OAuth flow exchanges short-lived token for **60-day long-lived token** via `/access_token?grant_type=ig_exchange_token`
- Publishing uses Facebook Graph API: Create media container → Publish container (requires Business Account + FB Page)

---

### File: [src/services/slack.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/slack.service.ts)

**Purpose:** Slack workspace integration.

**Key Functions:**
- OAuth with `chat:write, chat:write.public, channels:read, groups:read` scopes
- [sendMessage()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/slack.service.ts#76-123) — Prefers incoming webhook if available, falls back to `chat.postMessage` to `#general`

---

### File: [src/services/scheduler.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts) (⏰ Cron Engine)

**Purpose:** Background job scheduler for auto-publishing and weekly digests.

**Key Functions:**
- [start()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts#14-24) — Registers two cron jobs:
  - `* * * * *` (every minute) → `processScheduledPosts()`
  - `0 9 * * 1` (Monday 9 AM) → `processWeeklyDigest()`

- `processScheduledPosts()` — Fetches posts where `status=scheduled` AND `scheduled_time <= now`, locks them as `in_progress`, then publishes each via platform-specific services

- `publishPost(post)` — Routes to LinkedIn/Twitter/Slack/Reddit based on `ai_metadata.platform`

- `processWeeklyDigest()` — Fetches all profiles with `weekly_digest` enabled, calculates last 7 days stats, sends digest email

**Important Notes:**
- **Optimistic Locking** — Updates status to `in_progress` with a `WHERE status = 'scheduled'` guard to prevent race conditions in distributed environments.

---

### File: [src/services/stripe.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/stripe.service.ts)

**Purpose:** Stripe billing integration.

**Key Functions:**
- [createCheckoutSession(priceId, userId, userEmail)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/stripe.service.ts#17-46) — Creates subscription checkout session with success/cancel URLs and `allow_promotion_codes`
- [handleWebhook(signature, rawBody)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/stripe.service.ts#47-85) — Verifies signature, handles `checkout.session.completed` (upgrades user to [pro](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/linkedin/content-approval.tsx#144-156)) and `customer.subscription.deleted`

---

### File: [src/services/email.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts)

**Purpose:** Transactional email system using Nodemailer.

**Key Functions:**
- [sendWelcomeEmail(to, name)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts#51-68) — Onboarding welcome
- [sendApprovalRequest(to, postTitle, dashboardUrl)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts#69-83) — Post needs review notification
- [sendWeeklyDigest(to, stats)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts#84-100) — Performance summary
- [sendTeamInvitation(to, role, inviteLink)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts#101-116) — Workspace invite

**Important Notes:**
- In development (no SMTP configured), emails are logged to console instead of sent — graceful degradation.

---

### File: [src/services/news.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/news.service.ts)

**Purpose:** Fetches trending news from NewsData.io API.

**Key Functions:**
- [fetchNews(query)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/news.service.ts#12-46) — Searches English-language news, returns normalized article objects with title, description, link, source, category

---

### File: [src/services/socket.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/socket.service.ts)

**Purpose:** Real-time collaboration engine using Socket.IO.

**Key Functions:**
- [init(httpServer, allowedOrigins)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/socket.service.ts#9-53) — Attaches Socket.IO with auth middleware that validates Supabase JWT from handshake
- Event handlers:
  - `join_post` / `leave_post` — Room-based post collaboration
  - `typing_start` / `typing_end` — Typing indicators
  - `update_content` — Live content broadcasting to other editors

---

## 5. API Layer Explanation

### Authentication APIs

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/api/v1/auth/{platform}/connect` | GET | Generate OAuth URL | JWT token | `{ url }` |
| `/api/v1/auth/{platform}/callback` | GET | Handle OAuth redirect | `code`, `state` query params | Redirects to frontend |
| `/api/v1/auth/{platform}` | DELETE | Disconnect platform | JWT token | `{ success }` |

### Trend Ingestion APIs

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/api/v1/automation/scan` | POST | Scan news + AI analyze | `{ platform }` | `{ trends[], count }` |
| `/api/v1/automation/trends` | GET | List detected trends | `?page=1&limit=20&category=` | `{ data[], meta }` |
| `/api/v1/automation/seed` | POST | Dev: seed trend data | — | Delegates to `scanTrends` |

### Content Generation APIs

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/api/v1/automation/create-draft` | POST | AI draft from trend | `{ trend_id, platform }` | `{ post }` |
| `/api/v1/automation/generate-manual` | POST | Manual AI generation | `{ topic, platform, voice_preset, length, ... }` | `{ post }` |
| `/api/v1/automation/quota` | GET | Check generation limits | — | `{ used, limit, tier, remaining }` |

### Approval & Post Management APIs

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/api/v1/automation/posts` | GET | List posts (filtered) | `?status=published,failed&platform=linkedin&page=1` | `{ data[], meta }` |
| `/api/v1/automation/posts/:id` | PUT | Edit draft | `{ content, scheduled_time }` | `{ post }` |
| `/api/v1/automation/posts/:id` | DELETE | Delete post | — | `{ success }` |
| `/api/v1/automation/posts/:id/retry` | POST | Retry failed post | — | `{ success }` |

### Publishing APIs

| Endpoint | Method | Purpose | Input | Output |
|---|---|---|---|---|
| `/api/v1/automation/trigger-post` | POST | Publish to platform | `{ post_id }` | `{ platform_response }` |

### Analytics APIs

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v1/analytics/overview` | GET | Dashboard KPIs (total posts, reach, engagement) |
| `/api/v1/analytics/activity` | GET | Recent activity feed |
| `/api/v1/analytics/stats` | GET | 30-day daily metrics for charts |
| `/api/v1/automation/analytics` | GET | Aggregated analytics by date |
| `/api/v1/automation/analytics/export` | GET | CSV download |

---

## 6. Database Design

### Table: `users`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK) | Supabase Auth user ID |
| `subscription_tier` | TEXT | `free` / [pro](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/linkedin/content-approval.tsx#144-156) / `enterprise` |
| `subscription_status` | TEXT | `active` / `canceled` |
| `subscription_id` | TEXT | Stripe subscription ID |

**Relationships:** 1:1 with `profiles`, 1:N with all other tables via `user_id` FK.

---

### Table: `profiles`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK, FK→users) | Same as user ID |
| `email` | TEXT | Synced from auth |
| `full_name` | TEXT | Display name |
| `bio` | TEXT | User bio for AI context |
| `role` | TEXT | Professional role (for AI voice matching) |
| `niche` | TEXT | Industry niche |
| `goals` | TEXT | Content goals |
| `avatar_url` | TEXT | Profile picture |
| `api_key` | TEXT | Generated API key (`sk_live_...`) |
| `notification_preferences` | JSONB | `{ post_approval, weekly_digest }` |
| `subscription_plan` | TEXT | Plan name |
| `subscription_status` | TEXT | Billing status |
| `billing_cycle_end` | TIMESTAMP | Next billing date |
| `onboarding_completed` | BOOLEAN | Onboarding flow status |
| `updated_at` | TIMESTAMP | Last update |

---

### Table: `linked_accounts`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK→users) | Owner |
| `platform` | TEXT | `linkedin` / `twitter` / `instagram` / `slack` / `reddit` |
| `platform_user_id` | TEXT | Platform-specific user ID |
| `platform_username` | TEXT | Display username |
| `access_token` | TEXT | OAuth access token |
| `refresh_token` | TEXT | OAuth refresh token |
| `expires_at` / `token_expires_at` | TIMESTAMP | Token expiry |
| `status` / `connection_status` | TEXT | `connected` / `active` / `revoked` |
| `metadata` | JSONB | Platform-specific data (avatar, team_id, etc.) |

**Unique Constraint:** [(user_id, platform)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts#25-29) — Used as `onConflict` target for upserts.

---

### Table: `detected_trends`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK) | Auto-generated |
| `topic` | TEXT | Trend headline |
| `category` | TEXT | Genre/niche category |
| `velocity_score` | INTEGER | Impact score (0-100) |
| `source` | TEXT | `newsdata_io` |
| `metadata` | JSONB | `{ link, insight, suggested_angle, impact_score, confidence, engagement_signals, platforms, query_used }` |
| `created_at` | TIMESTAMP | Detection time |

**Indexing:** Sorted by `velocity_score` descending for trend ranking.

---

### Table: `generated_posts`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK→users) | Owner |
| `content` | TEXT | Post body text |
| `trend_id` | UUID (FK→detected_trends, nullable) | Source trend |
| `status` | TEXT | [draft](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74) / `needs_approval` / `approved` / `scheduled` / `published` / `failed` / `in_progress` |
| `scheduled_time` | TIMESTAMP | When to auto-publish |
| `published_at` | TIMESTAMP | Actual publish time |
| `platform_post_id` | TEXT | ID returned by the social platform |
| `media_urls` | TEXT[] | Attached media |
| `ai_metadata` | JSONB | `{ platform, source, topic }` |
| `error_message` | TEXT | Failure reason |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Last edit |

**JSONB Filtering:** Posts are filtered by platform using `supabase.contains("ai_metadata", { platform })`.

---

### Table: `automation_configs`

| Column | Type | Purpose |
|---|---|---|
| `user_id` | UUID (FK→users) | Owner |
| `platform` | TEXT | Target platform |
| `niches` | TEXT[] | Content niches for trend detection |
| `keywords` | TEXT[] | Search keywords |
| `tone_profile` | JSONB | `{ professionalism, voice }` |
| `schedule_cron` | TEXT | Cron expression for scheduling |
| `require_approval` | BOOLEAN | Manual approval before publishing |
| `smart_scheduling` | BOOLEAN | AI-optimized timing |
| `auto_retweet` | BOOLEAN | Auto-retweet setting |
| `is_active` | BOOLEAN | Config active flag |

**Unique Constraint:** [(user_id, platform)](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts#25-29) — One config per user per platform.

---

### Table: `automation_logs`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK→users) | Owner |
| `action` | TEXT | `draft_created` / `post_published` / `post_failed` / `manual_generation` / `post_retry_success` |
| `level` | TEXT | [info](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/tsconfig.tsbuildinfo) / `warning` / [error](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/error.middleware.ts#3-15) / [success](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/linkedin/content-approval.tsx#134-138) |
| `message` | TEXT | Human-readable log message |
| `metadata` | JSONB | Additional context (draft_id, etc.) |
| `created_at` | TIMESTAMP | Log timestamp |

---

### Table: `analytics_daily`

| Column | Type | Purpose |
|---|---|---|
| `user_id` | UUID (FK→users) | Owner |
| [date](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/validation.middleware.ts#4-25) | DATE | Aggregation date |
| `impressions` | INTEGER | View count |
| `clicks` | INTEGER | Click count |
| `likes` | INTEGER | Like count |
| `comments` | INTEGER | Comment count |
| `shares` | INTEGER | Share count |
| `engagement` | INTEGER | Total engagement |

---

### Table: `team_members`

| Column | Type | Purpose |
|---|---|---|
| [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) | UUID (PK) | Auto-generated |
| `email` | TEXT | Invited email |
| `role` | TEXT | `editor` / `viewer` / `admin` |
| `status` | TEXT | `pending` / `active` |
| `invited_by` | UUID (FK→users) | Who invited |
| `user_id` | UUID (FK→users) | Parent workspace owner |
| `created_at` | TIMESTAMP | Invite time |

---

### Schema Design Rationale

- **JSONB columns** (`metadata`, `ai_metadata`, `notification_preferences`, `tone_profile`) — Chosen for flexible, schema-less data that varies by platform or feature. Avoids expensive schema migrations for frequently changing structures.
- **Composite unique constraints** (`user_id, platform`) on `linked_accounts` and `automation_configs` — Enables safe upserts and prevents duplicate connections.
- **Status-based filtering** — The `status` enum drives the entire post lifecycle. Combined with timestamped transitions (`published_at`, `scheduled_time`), it enables both the cron scheduler and the dashboard to query efficiently.
- **Normalized structure** — User data is split between `users` (auth/billing) and `profiles` (display/preferences) following Supabase conventions.

---

## 7. Automation & Workflow Integration

The backend does **not** use n8n as an external workflow orchestrator. Instead, it implements its own automation engine using:

### Internal Automation Architecture

1. **LangGraph Pipeline** ([workflow.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts)) — Replaces traditional n8n AI nodes with a compiled state graph:
   - `START → analyzeNode → draftNode → formatNode → END`
   - Each node is a Gemini LLM call with different temperatures and system prompts
   - State flows through the graph accumulating `insight → draft → finalPost`

2. **Cron Scheduler** ([scheduler.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts)) — Replaces n8n timer triggers:
   - Every-minute post processing
   - Weekly Monday 9 AM digest emails

3. **Vercel Cron Endpoints** — For serverless deployment:
   - `GET /cron/process-posts` — Called by Vercel's cron system
   - `GET /cron/weekly-digest` — Called weekly
   - Both authenticated via `CRON_SECRET` header

4. **Approval System** — When `require_approval` is true:
   - Posts are created with status `NEEDS_APPROVAL`
   - Email notification sent to user
   - User approves via frontend → status changes to `APPROVED` or `SCHEDULED`
   - Cron picks up `SCHEDULED` posts when their time arrives

---

## 8. Data Flow

```
User Action (Frontend)
        │
        ▼
   ┌─────────────┐
   │  Express API │ ← JWT Auth Middleware validates token
   │  (Routes)    │ ← Zod Validation Middleware validates payload
   └──────┬──────┘
          │
          ▼
   ┌─────────────────┐
   │   Controllers    │ ← Business logic, quota checks
   └──────┬──────────┘
          │
    ┌─────┴─────────────────────────┐
    │                               │
    ▼                               ▼
┌──────────┐               ┌──────────────┐
│ Supabase │               │   Services    │
│ (DB)     │               │              │
└──────────┘               └──────┬───────┘
                                  │
                    ┌─────────────┼──────────────┐
                    ▼             ▼              ▼
              ┌──────────┐ ┌──────────┐  ┌──────────────┐
              │ NewsData │ │  Gemini  │  │ Social APIs  │
              │ API      │ │  LLM     │  │ (LI/TW/IG/   │
              └──────────┘ └──────────┘  │  Slack/Reddit)│
                                         └──────────────┘
```

### Step-by-Step: Trend → Published Post

1. **User clicks "Scan Trends"** → `POST /api/v1/automation/scan`
2. **NewsService** fetches latest articles from NewsData.io
3. **GeminiService** analyzes articles → scores and ranks by impact
4. Trends saved to `detected_trends` table
5. High-impact trends (>70 score) auto-generate drafts via **LangGraph WorkflowService**
6. Drafts inserted into `generated_posts` with status `NEEDS_APPROVAL`
7. **EmailService** sends approval notification if user opted in
8. **User reviews draft** on frontend → approves → status becomes `SCHEDULED`
9. **SchedulerService** (cron, every minute) picks up post where `scheduled_time <= now`
10. Cron **locks post** as `in_progress` → calls platform-specific service (LinkedIn/Twitter/etc.)
11. On success → `status: published`, `published_at` and `platform_post_id` saved
12. On failure → `status: failed`, `error_message` saved → user can retry

---

## 9. Security & Best Practices

### Authentication
- **JWT-based** via Supabase Auth. Every protected route uses [requireAuth](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/auth.middleware.ts#8-37) middleware.
- OAuth state parameters encode `user_id` in Base64 to survive cross-domain redirects.
- Socket.IO connections are authenticated via the same JWT in the handshake.

### API Validation
- **Zod schemas** validate all incoming request bodies, query params, and URL params at the middleware layer before controllers execute.
- Invalid requests receive structured 400 responses with field-level error details.

### Rate Limiting
- **Gemini API throttling**: 3.5-second delay between batch draft generations in `scanTrends` to stay within the free-tier 15 RPM limit.
- **`maxRetries: 3`** configured on all LangChain model instances for automatic exponential backoff.
- **Subscription quotas**: `checkQuota()` enforces per-tier monthly generation limits (free: 10, pro: 200).

### Error Handling
- **Global error handler** ([error.middleware.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/middleware/error.middleware.ts)) catches all unhandled errors.
- **Stack traces** only included in non-production responses.
- **Graceful degradation**: GeminiService falls back to random scoring if API key is missing. EmailService logs to console if SMTP is not configured. Missing tables return empty arrays instead of crashing (PostgreSQL error code `42P01` is caught).

### Secure Token Storage
- OAuth access/refresh tokens stored in `linked_accounts` table.
- **Service role key** is backend-only, never exposed to the frontend.
- API keys generated with `crypto.randomBytes(24)` and masked (first 8 + last 4 chars) when returned via the API.
- Stripe webhooks verified via signature validation using `rawBody`.

### Other Practices
- **User scoping**: Every database query includes `.eq("user_id", user_id)` to prevent cross-user data access.
- **CORS allowlist**: Only whitelisted origins can access the API.
- **Helmet**: Sets security headers (X-Frame-Options, CSP, etc.).
- **Environment-based deployment**: Vercel guards prevent long-running processes from crashing serverless functions.

---

## 10. Summary

The AI Canvas backend is a well-structured Express.js monolith written in TypeScript that implements a complete **AI-powered content lifecycle**:

1. **Discovers** trending topics via the NewsData.io API
2. **Analyzes** them using Google Gemini's trend intelligence system
3. **Generates** platform-optimized posts through a LangGraph multi-step agentic workflow
4. **Manages** approval flows with email notifications and configurable auto-scheduling
5. **Publishes** to 5 social platforms (LinkedIn, Twitter, Reddit, Instagram, Slack) via their native OAuth APIs
6. **Schedules** automated publishing via cron jobs (Node-Cron locally, Vercel Cron in production)
7. **Tracks** performance through daily analytics with CSV export capability
8. **Monetizes** via Stripe subscription billing with per-tier usage quotas
9. **Collaborates** in real-time via Socket.IO for live post editing

The codebase follows clean separation of concerns (Routes → Controllers → Services), uses Zod for type-safe validation, and implements resilient patterns like quota guards, optimistic locking, automatic retry with backoff, and graceful degradation when external services are unavailable.
