# Backend Architecture Documentation

## 1. Overview

The backend of the AI Canvas platform serves as the central brain connecting the React/Next.js frontend, third-party social media APIs, an AI engine, and the PostgreSQL database. It operates as a REST API layer that handles user authentication, billing, scheduling, and executing complex AI text generation. 

Instead of generating content blindly, the backend uses **LangGraph** (an AI workflow library) internally to autonomously research news, draft posts, and format hashtags. It also provides webhooks that can be triggered by external platforms like **n8n** (an automation tool) to insert or schedule new posts natively. The database and authentication are fully handled by **Supabase**.

---

## 2. Tech Stack Explanation

### Node.js & Express.js
* **Node.js**: The JavaScript runtime executing the server code outside of a browser.
* **Express.js**: A minimal web framework used on top of Node.js. It simplifies creating HTTP routes (like `GET /api/posts`), handling incoming network requests, and applying security middleware.

### Supabase / PostgreSQL
* **What it is**: Supabase is an open-source alternative to Firebase. Underneath the hood, it uses a highly scalable relational database called **PostgreSQL**.
* **Why it's used**: It provides out-of-the-box secure User Authentication (OAuth for Google/GitHub/Twitter) and powerful Row Level Security (RLS) so users can only access their own data.

### LLM APIs (Gemini & LangChain)
* **What it is**: The system connects to Google's **Gemini** (specifically `gemini-2.5-flash`) to generate human-like text. **LangChain & LangGraph** are wrapper libraries that help build "Agentic Workflows" — breaking down complex tasks into smaller nodes (Analyze Context \u2192 Draft Content \u2192 Format Hashtags).

### n8n (Integration via Webhooks)
* **What it is**: n8n is an open-source workflow automation tool (similar to Zapier).
* **Why it's used**: The backend exposes endpoints like `POST /create-draft`. n8n can listen for events (like a new RSS feed article) and trigger this backend webhook to instantly queue a new AI post for user approval.

---

## 3. Folder Structure

The project strictly follows the standard MVC (Model-View-Controller) / Service-Oriented architecture to separate concerns.

```text
backend/
├── src/
│   ├── controllers/      # Contains the main logic and rules for handling API requests.
│   ├── routes/           # Maps URL paths (e.g. /api/users) to specific controllers.
│   ├── services/         # Connects to external APIs (Twitter, Stripe, Gemini) or handles heavy lifting.
│   ├── schemas/          # Zod validation schemas to ensure incoming JSON data is formatted correctly.
│   ├── middleware/       # Functions that run *before* requests hit the controller (e.g. Auth check).
│   ├── server.ts         # The main entry file that starts the Express web server.
│   └── db.ts             # Initializes the singleton Supabase database client.
```

---

## 4. File-by-File Explanation

### File: [/server.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/server.ts)
**Purpose:**
The absolute starting point of the application. It boots up the Express server, applies global security settings, and binds the routes.

**Key Functions / Logic:**
* `app.use(cors())`: Allows the frontend running on a different port/domain to make requests safely.
* `app.use('/api/...', router)`: Mounts the modular routing files under the `/api` prefix.

**How it Connects:**
It aggregates all `/routes` and opens a network port (typically `8080`) to listen for incoming client requests.

---

### File: `/middleware/auth.middleware.ts`
**Purpose:**
A security gatekeeper for protected endpoints. It prevents unauthenticated users from accessing secure dashboards.

**Key Functions / Logic:**
* `requireAuth()` \u2192 Extracts the JWT (JSON Web Token) from the `Authorization` header, verifies it with Supabase, and attaches the parsed `user` object to the Express request so controllers know *who* is making the request.

---

### File: [/controllers/automation.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts)
**Purpose:**
The largest and most crucial brain of the application. It orchestrates user quotas, background trend parsing, and draft creation.

**Key Functions / Logic:**
* `scanTrends()` \u2192 Scans trending news and iterates over them, pacing requests with a 3.5s timeout, to auto-generate high-impact drafts.
* `createDraft()` \u2192 Accepts input parameters (or uses an n8n trigger) to save a draft into the `generated_posts` database table. Also checks if the user is out of monthly AI tokens.

**How it Connects:**
It is called by [automation.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/automation.routes.ts). It heavily relies on [workflow.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts) to actually write the text, and writes the finalized payload directly into the Supabase DB.

**Important Notes:**
Uses a "Wildcard SELECT" pattern (`.select('*')`) to prevent the database from crashing the server if specific columns go missing during structural updates.

---

### File: [/services/workflow.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts)
**Purpose:**
Contains the LangGraph "Agent" configuration for generating social media posts autonomously. 

**Key Functions / Logic:**
* [generatePost()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#111-130) \u2192 Creates a graph of nodes ([analyzeNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#25-44), [draftNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#45-74), [formatNode](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts#75-97)). It ensures the AI understands the user's role/niche before it attempts to write.

**How it Connects:**
Instantiates the `ChatGoogleGenerativeAI` model (Gemini). Controllers pass topics to this service, and it returns fully formatted strings. Includes a `maxRetries: 3` parameter for rate-limit resilience.

---

### File: [/services/scheduler.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts)
**Purpose:**
A background worker that checks for posts that are scheduled to be published at the current time.

**Key Functions / Logic:**
* `processScheduledPosts()` \u2192 Queries the database for posts with the `SCHEDULED` status whose timestamp is in the past. It then roots the payload to the specific social media service (e.g. `twitterService`).

**How it Connects:**
Triggered passively via node-cron or externally by Vercel Cron.

---

### File: `/services/[platform].service.ts` (e.g. twitter, linkedin)
**Purpose:**
Handles API-specific logic for external social networks.

**Key Functions / Logic:**
* [postTweet()](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/twitter.service.ts#75-122) \u2192 Takes raw text, fetches the user's decrypted OAuth keys from `linked_accounts`, authenticates with the Twitter v2 API, and submits the post.

---

## 5. API Layer Explanation

### Authentication APIs
* **Endpoint**: `/api/auth/register` and `/api/auth/login`
* **Method**: `POST`
* **Purpose**: Hashes passwords, authenticates heavily against Supabase Auth, and returns JWT tokens to the frontend client.

### Trend Ingestion APIs
* **Endpoint**: `/api/automation/scan`
* **Method**: `POST`
* **Input**: User platform context (optional)
* **Output**: Array of highly-scored trending topics.
* **Purpose**: Used when the user clicks "Simulate Agent", fetching news items and grading them for virality.

### Content Generation / N8N Webhook APIs
* **Endpoint**: `/api/automation/create-draft`
* **Method**: `POST`
* **Input**: `{ "content"?: "string", "trend_id"?: "uuid", "platform": "string" }`
* **Output**: Detailed JSON of the newly inserted [Post](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/lib/socket-client.ts#63-66) object.
* **Purpose**: Triggered via frontend UI or an n8n webhook. If `content` isn't provided, it fires LangGraph to auto-write the content based on the `trend_id`.

### Posting & Modification APIs
* **Endpoint**: `/api/automation/posts/:id`
* **Method**: `PUT` / `DELETE`
* **Input**: Modified text body or scheduled timestamps.
* **Purpose**: Allows users to manually edit an AI-generated draft or entirely purge it from the queue before it runs.

---

## 6. Database Design (Supabase PostgreSQL)

### `users` / `profiles`
* **Fields**: [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153) (PK UUID), `email`, `role`, `niche`, `subscription_tier`, `notification_preferences`.
* **Purpose**: Core entity representing a registered human.
* **Schema Choice**: Separating Auth (Supabase internal) from `profiles` (App logic) ensures we can enrich user data natively without breaking authentication protocols.

### `linked_accounts`
* **Fields**: [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153), `user_id` (FK), `platform`, `access_token`, `refresh_token`, `status`.
* **Purpose**: Stores the OAuth permissions required to publish to X or LinkedIn on the user's behalf.
* **Relationships**: Belongs to `users`.

### `detected_trends`
* **Fields**: [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153), `topic`, `velocity_score`, `impact_score`.
* **Purpose**: Acts as the seed material for AI models.

### `generated_posts`
* **Fields**: [id](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/src/components/dashboard/sidebar.tsx#46-153), `user_id` (FK), `content`, `status` (Enum), `ai_metadata` (JSONB), `scheduled_for`.
* **Purpose**: Controls the entire lifecycle of a single post from drafting \u2192 approval \u2192 successful publishing.
* **Indexing**: Heavily grouped and indexed by `user_id` and `status` to ensure fast filtering on the dashboard History view.

### `automation_configs`
* **Fields**: `user_id`, `platform`, `require_approval` (Boolean).
* **Purpose**: Controls whether AI operates "Fully Autonomously" or manually pings the user.

---

## 7. Automation Integration (n8n & Webhooks)

* **Triggering Workflows**: External services like RSS aggregators monitored by **n8n** detect new content events. n8n structures this event mathematically and fires a `POST` request (Webhook) to our `/create-draft` endpoint.
* **Approval Handling**: The backend receives the ping, writes the draft, and forces the post into the `NEEDS_APPROVAL` state. Instead of instantly posting, the backend utilizes [email.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/email.service.ts) to email the user a secure link back to the Dashboard asking them to double-check the AI's content.

---

## 8. Data Flow

1. **Trigger Phase**:
   User clicks "Simulate" (or external n8n webhook pings the API).
2. **Analysis Phase (Backend \u2192 AI)**:
   The backend fetches the user's `profile` (niche, goals) and parses trends \u2192 Pushes context to [workflow.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/workflow.service.ts).
3. **Generation Phase (LangGraph \u2192 Gemini)**:
   LangGraph builds a multi-step prompt and receives optimized strings back from Google's Gemini API.
4. **Approval Phase (Database)**:
   Payload is safely written to `generated_posts` under `NEEDS_APPROVAL`.
5. **Modification Phase (Frontend)**:
   User logs into React dashboard, edits the text, and updates the state to `SCHEDULED` using the `PUT` API.
6. **Execution Phase (Cron Job)**:
   [scheduler.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/scheduler.service.ts) detects the timestamp match \u2192 uses [linkedin.service.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/services/linkedin.service.ts) \u2192 successfully pushes to timeline. Updates database `status` to `PUBLISHED`.

---

## 9. Security & Best Practices

* **Authentication**: Enforced via Supabase JWTs. Validated securely using the `requireAuth` Express middleware on every single user-facing route.
* **API Validation**: Handled by **Zod**. If a client sends an integer where a string was expected in a request body, Zod immediately intercepts and blocks the request before it even reaches the Controller layer, preventing Node crashes.
* **Error Handling**: Standardized HTTP Codes. E.g. `401 Unauthorized`, `403 Quota Exceeded`, `429 Too Many Requests`. Centralized `try/catch` loops in async controllers.
* **Secure Token Storage**: User access tokens for LinkedIn/X are secured via Postgres Row Level Security (RLS). External `CRON_SECRET` environmental variables guarantee malicious actors cannot trigger publishing loops.
* **Rate Limiting Resilience**: Explicit `setTimeout` throttling paces API bursts automatically padding parallel AI threads.

---

## 10. Summary

The AI Canvas backend functions as a scalable, middleware-rich orchestration layer. It seamlessly abstracts away the extremely complex boundaries of AI multi-node workflows (LangGraph/Gemini), diverse external Social API handshakes, and strict data-consistency checks. 

By relying on robust external technologies like generic HTTP Webhooks (n8n compatible), Supabase managed queues, and secure Zod pipelines, the system processes thousands of analytical threads without the core web server thread blocking. It's essentially a secure, event-driven pipeline specifically built to connect intelligent AI to authenticated social ecosystems.
