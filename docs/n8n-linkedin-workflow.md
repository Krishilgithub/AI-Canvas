# n8n LinkedIn Draft Post Automation Workflow

## Overview

This document describes the n8n workflow that receives draft post requests from the AI Canvas application and generates LinkedIn posts using AI.

## Workflow URL

**Webhook Endpoint:** `http://localhost:5678/webhook/draft_post`

## Input Format

The webhook receives a JSON payload with the following structure:

```json
{
  "topic": "The future of remote work",
  "target_audience": "Tech professionals, CTOs",
  "keywords": ["AI", "automation", "productivity", "innovation"],
  "tone": "thought_leader",
  "style": "educational",
  "timestamp": "2026-02-03T11:03:13.000Z"
}
```

### Field Descriptions

| Field             | Type   | Required | Description                                      | Example Values                                 |
| ----------------- | ------ | -------- | ------------------------------------------------ | ---------------------------------------------- |
| `topic`           | string | Yes      | The main topic for the post                      | "The future of remote work"                    |
| `target_audience` | string | No       | Target audience (defaults to "General audience") | "Tech professionals, Startups"                 |
| `keywords`        | array  | No       | Array of keywords to include                     | `["AI", "productivity"]`                       |
| `tone`            | string | Yes      | Tone of voice for the post                       | "professional", "casual", "thought_leader"     |
| `style`           | string | Yes      | Writing style                                    | "storytelling", "educational", "inspirational" |
| `timestamp`       | string | Yes      | ISO timestamp of request                         | "2026-02-03T11:03:13.000Z"                     |

### Tone Options

- `professional` - Professional and formal
- `casual` - Relaxed and conversational
- `enthusiastic` - Energetic and passionate
- `thought_leader` - Industry expert perspective
- `authoritative` - Commanding and definitive
- `conversational` - Friendly dialogue

### Style Options

- `storytelling` - Narrative-driven content
- `educational` - Teaching and informative
- `inspirational` - Motivational and uplifting
- `data_driven` - Backed by statistics and facts
- `question_based` - Engaging with questions
- `listicle` - List format (e.g., "5 Ways to...")

---

## n8n Workflow Setup

### Node 1: Webhook Trigger

**Node Type:** Webhook  
**Method:** POST  
**Path:** `/webhook/draft_post`  
**Response Mode:** Immediately

**Configuration:**

```json
{
  "httpMethod": "POST",
  "path": "draft_post",
  "responseMode": "lastNode",
  "options": {}
}
```

**Output:** Receives the JSON payload from the frontend

---

### Node 2: Extract & Validate Data

**Node Type:** Code (JavaScript)  
**Description:** Extract and validate incoming data

**Code:**

```javascript
// Extract data from webhook
const topic = $input.item.json.body.topic;
const targetAudience =
  $input.item.json.body.target_audience || "General audience";
const keywords = $input.item.json.body.keywords || [];
const tone = $input.item.json.body.tone || "thought_leader";
const style = $input.item.json.body.style || "educational";

// Validate required fields
if (!topic) {
  throw new Error("Topic is required");
}

// Format keywords as comma-separated string
const keywordsStr = keywords.join(", ");

return {
  topic,
  targetAudience,
  keywords: keywordsStr,
  tone,
  style,
  rawKeywords: keywords,
  timestamp: new Date().toISOString(),
};
```

---

### Node 3: Build AI Prompt

**Node Type:** Code (JavaScript)  
**Description:** Create a detailed prompt for the AI

**Code:**

```javascript
const topic = $input.item.json.topic;
const audience = $input.item.json.targetAudience;
const keywords = $input.item.json.keywords;
const tone = $input.item.json.tone;
const style = $input.item.json.style;

// Tone mapping
const toneDescriptions = {
  professional: "professional and polished",
  casual: "casual and approachable",
  enthusiastic: "enthusiastic and energetic",
  thought_leader: "as an industry thought leader with expertise",
  authoritative: "authoritative and commanding",
  conversational: "conversational and friendly",
};

// Style mapping
const styleDescriptions = {
  storytelling: "Use a storytelling approach with a compelling narrative",
  educational: "Write in an educational style, teaching the reader",
  inspirational: "Create inspirational content that motivates action",
  data_driven: "Use data and statistics to support your points",
  question_based: "Engage readers with thought-provoking questions",
  listicle: "Create a list-based format (e.g., 'Top 5...', '7 Ways...')",
};

const prompt = `Write a compelling LinkedIn post about: ${topic}

REQUIREMENTS:
- Target Audience: ${audience}
- Tone: ${toneDescriptions[tone] || "professional"}
- Style: ${styleDescriptions[style] || "educational"}
- Keywords to incorporate naturally: ${keywords}

STRUCTURE:
1. Start with an attention-grabbing hook
2. Provide valuable insights or information
3. Include a clear call-to-action or thought-provoking question
4. Keep it engaging and scannable

FORMATTING:
- Use short paragraphs (2-3 sentences max)
- Include 2-3 relevant emojis strategically placed
- Add line breaks for readability
- Keep total length between 150-300 words

Make it authentic, valuable, and shareable.`;

return {
  prompt,
  topic,
  audience,
  keywords,
  tone,
  style,
};
```

---

### Node 4: AI Content Generation

**Node Type:** OpenAI  
**Operation:** Message a Model  
**Model:** gpt-4 or gpt-3.5-turbo

**Configuration:**

```json
{
  "resource": "chat",
  "operation": "complete",
  "model": "gpt-4",
  "messages": {
    "values": [
      {
        "role": "system",
        "content": "You are a professional LinkedIn content writer who creates engaging, high-quality posts."
      },
      {
        "role": "user",
        "content": "={{ $json.prompt }}"
      }
    ]
  },
  "options": {
    "temperature": 0.7,
    "maxTokens": 500
  }
}
```

**Output:** Generated LinkedIn post content

---

### Node 5: Format Response

**Node Type:** Code (JavaScript)  
**Description:** Format the AI response and prepare the final output

**Code:**

```javascript
const generatedContent = $input.item.json.choices[0].message.content;
const topic = $("Build AI Prompt").item.json.topic;
const audience = $("Build AI Prompt").item.json.audience;

return {
  success: true,
  draft_post: {
    content: generatedContent,
    topic: topic,
    target_audience: audience,
    generated_at: new Date().toISOString(),
    status: "needs_approval",
  },
  metadata: {
    tone: $("Build AI Prompt").item.json.tone,
    style: $("Build AI Prompt").item.json.style,
    keywords: $("Build AI Prompt").item.json.keywords,
  },
};
```

---

### Node 6: Save to Database (Optional)

**Node Type:** HTTP Request or Supabase  
**Description:** Save the generated draft to your database

**For Supabase:**

```json
{
  "operation": "insert",
  "table": "generated_posts",
  "data": {
    "content": "={{ $json.draft_post.content }}",
    "topic": "={{ $json.draft_post.topic }}",
    "status": "needs_approval",
    "metadata": "={{ JSON.stringify($json.metadata) }}"
  }
}
```

**For HTTP Request to Backend:**

- **Method:** POST
- **URL:** `http://localhost:4000/api/v1/automation/drafts`
- **Body:**

```json
{
  "content": "={{ $json.draft_post.content }}",
  "topic": "={{ $json.draft_post.topic }}",
  "target_audience": "={{ $json.draft_post.target_audience }}",
  "status": "needs_approval",
  "platform": "linkedin"
}
```

---

### Node 7: Return Response

**Node Type:** Respond to Webhook  
**Description:** Send response back to the frontend

**Response:**

```json
{
  "success": true,
  "message": "Draft post generated successfully",
  "data": "={{ $json }}"
}
```

---

## Workflow Diagram

```
┌─────────────────────┐
│  Frontend Request   │
│  (Generate Button)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Webhook Trigger   │
│  POST /draft_post   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Extract & Validate  │
│       Data          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Build AI Prompt    │
│  (Customize prompt) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   OpenAI GPT-4      │
│ Generate Content    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Format Response    │
│  (Structure data)   │
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ▼                     ▼
┌─────────────────────┐  ┌──────────────────┐
│  Save to Database   │  │ Return Response  │
│    (Optional)       │  │   to Frontend    │
└─────────────────────┘  └──────────────────┘
```

---

## Testing the Workflow

### 1. Start n8n

```bash
npx n8n
```

### 2. Import Workflow

- Open n8n at `http://localhost:5678`
- Create a new workflow
- Add the nodes as described above
- Activate the workflow

### 3. Test from Frontend

- Navigate to the LinkedIn page in your application
- Fill out the AI Post Generator form:
  - **Topic:** "The future of AI in healthcare"
  - **Target Audience:** "Healthcare professionals"
  - **Keywords:** "AI, machine learning, patient care"
  - **Tone:** "Thought Leader"
  - **Style:** "Educational"
- Click "Generate Draft Post"

### 4. Verify Response

Check that:

- ✅ Webhook receives the request
- ✅ AI generates relevant content
- ✅ Response is returned to frontend
- ✅ Toast notification appears
- ✅ Draft is saved to database (if configured)

---

## Error Handling

Add an **Error Trigger** node to handle failures:

**Node Type:** Error Trigger  
**Connected to:** All nodes

**Then add:**

**Node Type:** Code (Send Error Response)

```javascript
return {
  success: false,
  error: $json.error.message || "Failed to generate post",
  timestamp: new Date().toISOString(),
};
```

---

## Environment Variables

Add these to your n8n environment:

```env
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=your_supabase_url
DATABASE_KEY=your_supabase_key
```

---

## Next Steps

1. **Enhance with Research:** Add a web scraping node to research the topic before generating
2. **Add Trending Detection:** Check current LinkedIn trends related to the topic
3. **Generate Multiple Variants:** Create 2-3 different versions for the user to choose
4. **Schedule Publishing:** Add scheduling capabilities for approved posts
5. **Analytics Integration:** Track performance of published posts

---

## Support

For issues with the workflow:

1. Check n8n logs: `http://localhost:5678/workflows`
2. Verify webhook URL is accessible
3. Ensure OpenAI API key is valid
4. Check database connection (if saving drafts)
