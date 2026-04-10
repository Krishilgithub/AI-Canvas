# Full-Stack Developer Interview Questions 

Given the context of your **AI SaaS project**, these interview questions cover the core technologies you are using: **React, Next.js, Node.js, TypeScript, API Design, and Shadcn UI**.

---

## 1. Next.js & React Architecture

### Q1: What is the difference between Server Components and Client Components in Next.js? When should you use each?
**Answer:**
- **Server Components (RSC):** Render exclusively on the server. They reduce the JavaScript bundle size sent to the client, can directy and securely access backend resources (databases, file systems), and improve initial page load speed. *Use cases: Fetching data, accessing backend services, rendering static/mostly static UI.*
- **Client Components:** Render on both the server (SSR) and the client. They hydrate on the client to become fully interactive. *Use cases: Adding interactivity (`onClick`, `onChange`), utilizing state/lifecycle hooks (`useState`, `useEffect`), or using browser-only APIs (like `window`).*

### Q2: What is hydration in React?
**Answer:**
Hydration is the process by which React attaches event listeners and state to the static HTML received from the server (during Server-Side Rendering or Static Site Generation). It transforms the static HTML into a fully interactive React application in the browser.

### Q3: Explain why we might use a custom hook instead of writing logic directly inside a component.
**Answer:**
Custom hooks allow us to encapsulate and reuse stateful logic across multiple components. For example, if multiple components need to subscribe to a user's authentication status or manage a debounced search input, moving that logic into a custom hook (e.g., `useAuth` or `useDebounce`) keeps the components clean and avoids code duplication.

---

## 2. API Design & Node.js Backend

### Q4: In your API middleware, you have `rate-limit.middleware.ts`. Why is Rate Limiting necessary for an AI SaaS application?
**Answer:**
Rate limiting is crucial for:
1. **Preventing Abuse:** It stops automated bots or malicious users from overwhelming the API.
2. **Cost Control:** AI model APIs (like OpenAI, Anthropic) charge per token/request. Rate limiting prevents runaway costs if a user maliciously or accidentally spams a specific endpoint.
3. **Fair Usage:** It effectively ensures that system compute resources are distributed fairly among all SaaS users.

### Q5: What is the difference between authentication and authorization?
**Answer:**
- **Authentication** verifies *who* the user is (e.g., verifying a JWT token after login).
- **Authorization** verifies *what* the user is allowed to do (e.g., checking if the user has a `Premium` subscription or an `Admin` role before allowing access to an exclusive AI generation endpoint).

### Q6: How do you handle errors centrally in an Express.js backend?
**Answer:**
Error handling should be centralized using an error-handling middleware function taking 4 arguments: `(err, req, res, next)`. Instead of sending responses manually in every controller `catch` block, controllers pass the error using `next(err)`. The centralized error handler then catches it and formats the error consistently (e.g., logging the stack trace, removing sensitive details in production, and responding with standard JSON and the appropriate HTTP status code).

---

## 3. UI/UX & Component Libraries (Shadcn UI & Tailwind)

### Q7: What is Shadcn UI, and how does it differ from traditional component libraries like MUI or Bootstrap?
**Answer:**
Shadcn UI is a collection of re-usable components built entirely with Tailwind CSS and Radix UI primitives. Unlike MUI or Bootstrap, which distribute as installable dependency packages, Shadcn components are copied directly into the project's source code (usually via a CLI). This provides absolute ownership and full customization power over the component's internal markup and styling without having to fight the library's opinions.

### Q8: What does the `cn()` utility function do in your UI components?
**Answer:**
The `cn()` function is a custom utility (usually combining `clsx` and `tailwind-merge`). It resolves conflicting Tailwind CSS classes dynamically. For example, if a base component has `p-4` (padding: 1rem) but is passed an override class `p-8` (padding: 2rem), `tailwind-merge` intelligently strips the `p-4` and keeps `p-8` rather than letting browser CSS cascade rules arbitrarily decide which takes priority.

---

## 4. TypeScript 

### Q9: What are Generics in TypeScript? Can you give a practical example?
**Answer:**
Generics allow you to create reusable components/functions that can work over a variety of types rather than a single fixed one. 
*Example:* A generic API response interface.
```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
// Usage:
const userResponse: ApiResponse<User> = { success: true, data: { name: "Alice" } };
```

### Q10: What is the difference between `interface` and `type` in TypeScript?
**Answer:**
Both are used to define shapes of data. 
- **Interfaces** can be merged (declaration merging), making them great for defining objects/APIs that can be extended by others. 
- **Type Aliases** are more flexible—they can define unions `type ID = string | number`, intersections, and primitive types. Types do not support declaration merging.

---

## 5. System Design (Specific to Social Media AI SaaS)

### Q11: Your system integrates with Twitter and Reddit. If you need to post generated content exactly at a user-specified time, how would you architect this scheduling system?
**Answer:**
I would use a message broker and a job scheduler (like BullMQ with Redis). 
1. The user schedules the post on the Next.js frontend.
2. The backend controller writes the job into the database with a specific `publishAt` timestamp and adds it to a delayed queue.
3. Worker nodes poll or listen to the delayed queue. When the time is reached, the job is moved to the active queue.
4. The worker executes the API calls to the Twitter/Reddit APIs, handles retries gracefully on network/rate-limits, and updates the database state.

### Q12: How would you handle Webhook events from third-party platforms?
**Answer:**
Webhooks must be handled asynchronously and securely.
1. **Verification:** Verify the signature of the incoming request payload using the provider's specific webhook secret to ensure it actually came from them.
2. **Acknowledge Quickly:** Respond to the provider with a `200 OK` immediately so they don't timeout and retry the webhook.
3. **Queueing:** Push the webhook payload to a background task queue to process the actual logic (e.g., processing an incoming Twitter mention or updating a Stripe subscription tier).
