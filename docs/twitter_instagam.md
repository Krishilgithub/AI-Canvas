# Implementation Plan: Social Media API Integrations

The current integration routes (`/api/v1/auth/:platform/connect`) are returning a simulated successful callback. To fully integrate Twitter and Instagram, we must implement actual OAuth 2.0 flows and API calls to push content to those platforms.

## User Review & Action Required

> [!IMPORTANT]
> To make these integrations actually work, you **must** register developer applications with X (Twitter) and Meta (Instagram) and provide the API keys in your [backend/.env](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/.env) file. Without these keys, the backend cannot initiate the OAuth handshake.

Please create applications and add the following context to your [backend/.env](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/.env):

```env
# Twitter Developer Portal (OAuth 2.0 PKCE)
TWITTER_CLIENT_ID="your_client_id"
TWITTER_CLIENT_SECRET="your_client_secret"

# Instagram (Meta for Developers - Instagram Graph API)
INSTAGRAM_APP_ID="your_app_id"
INSTAGRAM_APP_SECRET="your_app_secret"
```

## Proposed Changes

### 1. New Service Integrations

#### [NEW] `backend/src/services/twitter.service.ts`

- Implement OAuth 2.0 with PKCE for Twitter via `twitter-api-v2`.
- Implement a `postTweet(userId, content)` function to push the final text.

#### [NEW] `backend/src/services/instagram.service.ts`

- Implement Instagram Graph API OAuth.
- Implement a `postToInstagram(userId, imageUrl, caption)` function. Note: Instagram API historically requires an image or video to post.

### 2. Update Authentication Controllers

#### [MODIFY] [backend/src/controllers/auth.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/auth.controller.ts)

- Remove the "Generic simulation loop".
- Define `getTwitterAuthUrl` and `handleTwitterCallback`.
- Define `getInstagramAuthUrl` and `handleInstagramCallback`.
- Store the resulting `access_token` and `refresh_token` in the `linked_accounts` table securely.

#### [MODIFY] [backend/src/routes/auth.routes.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/routes/auth.routes.ts)

- Map the specific `/twitter/connect` and `/instagram/connect` routes to their respective new methods instead of the `/:platform` generic handler.

### 3. Execution Pipeline Updates

#### [MODIFY] [backend/src/controllers/automation.controller.ts](file:///c:/Users/Krishil%20Agrawal/Desktop/College%20Works/SGPS/SGP6/ai-saas/backend/src/controllers/automation.controller.ts)

- Update the `executePost(post)` function so that instead of just simulated logs, it calls:
  - `twitterService.postTweet()` if `platform === 'twitter'`
  - `instagramService.postToInstagram()` if `platform === 'instagram'`
- Trap errors from these APIs (e.g., rate limits, token expiry) and update the post status to `failed` with the exact error message for the dashboard to display.

## Verification Plan

### Automated Tests

- Unit test the auth URL generation to ensure state and PKCE challenges are correctly formatted.

### Manual Verification

1. Click "Connect Twitter" from the dashboard UI and verify it redirects to the actual X.com authorization page.
2. Authorize the app and verify it redirects back, saving the token to the Supabase database.
3. Draft a test post targeted for Twitter and trigger "Publish Now", then verify the post appears live on the test Twitter account.
