# Settings Section Audit & API Key Flow Analysis

---

## 🔍 Part 1: Does the User's API Key Actually Work?

### Short Answer: **Mostly YES — but there was one critical bug (now fixed).**

The platform has a well-architected key pipeline. Here's how it flows:

### The Intended Flow
```
User enters Gemini key in Settings → AI Models
       ↓
Frontend calls POST /api/v1/keys/save { provider: "gemini", apiKey: "..." }
       ↓
Backend (keys.controller.ts) encrypts key → stores in Supabase `user_api_keys` table
       ↓
When AI is invoked, keysService.getKey(userId, 'gemini') is called
       ↓
If a user key is found → it overrides the system GEMINI_API_KEY env var
       ↓
GoogleGenerativeAI is instantiated with the user's key ✅
```

### What Was Working ✅

| AI Feature | Key Used Correctly? |
|---|---|
| Scan Trends (`analyzeTrendIntelligence`) | ✅ YES — `userId` passed correctly |
| Text Rewrite (`rewriteContent`) | ✅ YES — `user_id` passed correctly |
| Post Autopsy (`analyzePostPerformance`) | ✅ YES — `userId` passed correctly |
| LangGraph Workflow (analyzeNode, draftNode, formatNode) | ✅ YES — `keysService.getKey(userId, 'gemini')` with fallback to env |

### The Bug Found & Fixed 🐛

**Location:** `automation.controller.ts → createDraft` (line ~351)

The `workflowService.generatePost()` was being called like this:
```typescript
// ❌ BROKEN
content = await workflowService.generatePost(
  { topic: trend.topic, platform: targetPlatform },
  userProfile || undefined,  // <-- `id` field NOT guaranteed
  trend.metadata?.insight || "No context"
);
```

Inside the LangGraph workflow nodes, the user key is fetched via:
```typescript
const userId = state.userContext?.id;
const dbKey = await keysService.getKey(userId, 'gemini');
```

If `userProfile` from Supabase happened to not include the `id` field (e.g., a partial select query was used), `userId` would be `undefined` and the system would silently fall back to the shared `GEMINI_API_KEY`, ignoring the user's personal key entirely.

**Fix Applied:**
```typescript
// ✅ FIXED — id is now guaranteed to be present
content = await workflowService.generatePost(
  { topic: trend.topic, platform: targetPlatform },
  { ...(userProfile || {}), id: user_id }, // FIX: ensure user_id is in context for keysService lookup
  trend.metadata?.insight || "No context"
);
```

---

## 🗂️ Part 2: Settings Section Feature Audit

### Section 1: Profile
| Feature | Status | Notes |
|---|---|---|
| View full name & email | ✅ Implemented | Loads from `/user/profile` |
| Edit full name | ✅ Implemented | Saved via POST `/user/profile` |
| Edit professional bio | ✅ Implemented | Bio is injected into AI prompts as persona context |
| Custom avatar upload | ❌ Not Implemented | Currently auto-generated from initials. "Custom avatars coming soon." message shown |
| Email change | ❌ Not Implemented | Input is disabled with "Contact support" hint |
| Delete account | ✅ Implemented | Calls DELETE `/user/profile` with confirm dialog |

---

### Section 2: Portfolio
| Feature | Status | Notes |
|---|---|---|
| View public portfolio page | ✅ Implemented | Links to `/p/{userId}` |
| Copy portfolio URL | ✅ Implemented | Clipboard copy with toast |
| Auto-updating content | ✅ Implemented | Shows top published posts dynamically |
| Customize portfolio (theme/bio/order) | ❌ Not Implemented | No customization UI exists |

---

### Section 3: Billing
| Feature | Status | Notes |
|---|---|---|
| View current plan (Free/Pro/Enterprise) | ✅ Implemented | Loaded from `/user/profile/subscription` |
| Upgrade to Pro via Stripe Checkout | ✅ Implemented | Redirects to Stripe if `NEXT_PUBLIC_STRIPE_PRICE_ID` is set |
| Manage billing via Stripe Portal | ✅ Implemented | Opens Stripe Customer Portal |
| View plan features comparison | ✅ Implemented | Static feature grid shown on free plan |
| Usage-based billing / credit top-ups | ❌ Not Implemented | Plans are hardcoded (10 free / 200 pro). No mid-month add-ons |
| Invoice history | ❌ Not Implemented | Delegated to Stripe Portal, not surfaced in-app |

---

### Section 4: API Keys (AI Canvas Platform Key)
| Feature | Status | Notes |
|---|---|---|
| Generate a personal AI Canvas API key | ✅ Implemented | Creates key via POST `/user/profile/api-key` |
| View / reveal key (show/hide toggle) | ✅ Implemented | Eye-icon toggle with one-time reveal warning |
| Copy key to clipboard | ✅ Implemented | |
| Regenerate key (invalidates old) | ✅ Implemented | Confirm dialog + toast |
| Using key to authenticate API calls | ⚠️ Partial | Key is generated and stored, but no auth middleware verifies Bearer `sk_...` keys. External SDK usage is not validated. |

---

### Section 5: AI Models (LLM Provider Keys)
| Feature | Status | Notes |
|---|---|---|
| Save a Gemini API key | ✅ Implemented | POSTed to `/keys/save`, encrypted in DB |
| Save an OpenAI API key | ✅ UI Implemented | Key is saved to DB. **However, OpenAI is NOT used anywhere in the backend currently.** |
| Save an Anthropic Claude key | ✅ UI Implemented | Key is saved to DB. **However, Claude is NOT used anywhere in the backend currently.** |
| Remove / disconnect a saved key | ✅ Implemented | DELETE `/keys/remove?provider=...` |
| View which keys are connected | ✅ Implemented | `isSaved: true` state shown with checkmark |
| Gemini key used for Trend Scan | ✅ Implemented | `keysService.getKey(userId, 'gemini')` called correctly |
| Gemini key used for Draft Generation | ✅ Fixed | Bug patched — `user_id` now guaranteed in workflow context |
| Gemini key used for Text Rewrite | ✅ Implemented | `user_id` passed correctly |
| Gemini key used for Post Autopsy | ✅ Implemented | `userId` passed correctly |
| OpenAI key used for any generation | ❌ Not Implemented | Backend hardcoded to Gemini only |
| Claude key used for any generation | ❌ Not Implemented | Backend hardcoded to Gemini only |
| AI model selector (choose which provider) | ❌ Not Implemented | No UI or backend routing to switch between Gemini/OpenAI/Claude per request |

---

### Section 6: Team
| Feature | Status | Notes |
|---|---|---|
| View existing team members | ✅ Implemented | `TeamManagement` component loaded |
| Invite members via email | ✅ Implemented | Via POST `/automation/team/invite` |
| Remove members | ✅ Implemented | DELETE `/automation/team/:id` |
| Role-Based Access Control (RBAC) | ❌ Not Implemented | Members share the same level of access. No `admin`, `editor`, `viewer` roles |
| Workspace separation per agency | ❌ Not Implemented | All data is tied to `user_id`, not a `workspace_id` |

---

### Section 7: Notifications
| Feature | Status | Notes |
|---|---|---|
| Toggle weekly email digest | ✅ Implemented | Stored in `profiles.notification_preferences` |
| Toggle draft approval alerts | ✅ Implemented | Email sent when draft created via `emailService.sendApprovalRequest` |
| Toggle trend alert emails | ✅ Implemented | Preference stored, but trend alert emails are not yet triggered automatically |
| Toggle security alert emails | ✅ Implemented | Preference stored |
| Save notification preferences | ✅ Implemented | Saved via the same `POST /user/profile` endpoint |
| In-app notification panel (bell icon) | ✅ Implemented | Socket.IO pushes notifications; displayed in notification bell |
| Real trend spike push alerts | ❌ Not Implemented | `trend_alert` preference exists, but no background job auto-scans and emails |

---

### Section 8: Documentation
| Feature | Status | Notes |
|---|---|---|
| Link to documentation hub | ⚠️ Partial | Button links to `/docs` which may be a placeholder or not fully built |
| Inline API reference | ❌ Not Implemented | Swagger docs exist at `/api-docs` (backend) but not surfaced in the settings UI |

---

## 📋 Part 3: Priority Fix List

### Critical (Fix Now)
1. ~~**`createDraft` userId Bug** — User Gemini key was ignored during draft creation~~ ✅ **Fixed in this session**

### High Priority (Implement Next)
2. **OpenAI / Claude Key Routing** — Save & use user-provided OpenAI or Claude keys for generation. Requires a provider-routing abstraction in `GeminiService` or a new `LlmService`.
3. **AI Canvas API key Bearer Auth** — Currently generated but never validated. Add middleware to authenticate requests using `Authorization: Bearer sk_...` for external SDK users.
4. **Trend Alert Auto-Emails** — The `trend_alert` toggle exists but no job sends the email. Wire up a cron/background job to scan trends and email users when high-impact trends are found.

### Medium Priority
5. **RBAC for Team Members** — Admin / Editor / Viewer roles to prevent team members from deleting posts or changing billing.
6. **Custom Avatar Upload** — Currently shows initials only.

### Low Priority / Nice-to-Have
7. **AI Model Selector** — Let users choose per-generation which provider (Gemini/GPT-4/Claude) they want to use.
8. **Portfolio Customization** — Theme, bio, pinned posts.
9. **Invoice History in-app** — Currently fully delegated to Stripe Portal.
