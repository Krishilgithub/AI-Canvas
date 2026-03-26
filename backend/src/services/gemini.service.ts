import { GoogleGenerativeAI } from "@google/generative-ai";
import { keysService } from "./keys.service";

// Output structure from the Trend Intelligence System
export interface TrendAnalysis {
  topic: string;
  summary: string;
  platforms: string[];
  impact_score: number;
  confidence: number;
  engagement_signals: {
    likes: number;
    comments: number;
    shares: number;
    velocity: number;
  };
  reasoning: string;
  suggested_angle: string;
  // Legacy fields for backward compatibility
  velocity_score?: number;
  insight?: string;
  title?: string;
  link?: string;
  category?: string;
}

export interface TrendIntelligenceInput {
  userId?: string;
  genre: string;
  keywords: string[];
  target_platform: string;
  time_window?: string;
  platform_data: RawArticle[];
  max_trends?: number;
}

export interface RawArticle {
  title: string;
  description?: string;
  link?: string;
  source?: string;
  category?: string;
  published?: string;
}

// ─── Platform character limits ────────────────────────────────────────────────
export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  twitter:   280,
  x:         280,
  linkedin:  3000,
  reddit:    40000,
  instagram: 2200,
  youtube:   5000,
};

export class GeminiService {
  private async getModel(userId?: string): Promise<ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null> {
    let apiKey = process.env.GEMINI_API_KEY;
    if (userId) {
      const userKey = await keysService.getKey(userId, 'gemini');
      if (userKey) apiKey = userKey;
    }
    if (!apiKey) return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Advanced Trend Intelligence Analyzer
  // ─────────────────────────────────────────────────────────────────────────
  async analyzeTrendIntelligence(input: TrendIntelligenceInput): Promise<TrendAnalysis[]> {
    const {
      userId,
      genre,
      keywords,
      target_platform,
      time_window = "last 24 hours",
      platform_data,
      max_trends = 10,         // FIX: was hardcoded to 5 — now configurable, default 10
    } = input;

    const model = await this.getModel(userId);
    if (!model) {
      console.warn("[GeminiService] Gemini API key not configured — returning error state instead of random scores.");
      // FIX: was returning Math.random() scores; now throws so callers can surface the error
      throw new Error("AI_UNAVAILABLE");
    }

    const rawDataString = platform_data
      .map((a, i) =>
        `[${i + 1}] Title: "${a.title}"
         Source: ${a.source || "Unknown"}
         Category: ${a.category || "General"}
         Published: ${a.published || "Unknown"}
         Description: ${a.description || "N/A"}`
      )
      .join("\n\n");

    // FIX: Removed the false claim "data collected from LinkedIn, Reddit, and X".
    // The actual data source (NewsData.io general news) is now accurately described.
    const prompt = `You are an expert trend intelligence analyst specializing in identifying high-impact, discussion-worthy topics for professional social media platforms.

Your task is to analyze news articles and industry signals to identify the most impactful trends relevant to the user's interests.

━━━━━━━━━━━━━━━━━━━━━━
INPUT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━

User Preferences:
* Genre: ${genre}
* Keywords: ${keywords.join(", ") || "None specified"}
* Target Platform: ${target_platform}
* Time Window: ${time_window}

Raw News & Signal Data:
${rawDataString}

━━━━━━━━━━━━━━━━━━━━━━
YOUR OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━

From the provided news articles and signals, extract, analyze, and rank the most impactful trends that have a high probability of performing well as content on the target platform.

━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS RULES
━━━━━━━━━━━━━━━━━━━━━━

1. Relevance Filtering
* Only keep topics strongly related to the user's genre and keywords
* Remove noise, generic news, or irrelevant discussions

2. Deduplication
* Merge similar topics into a single unified trend
* Normalize wording into a clean topic phrase

3. Engagement Estimation
Assess each topic's likely engagement based on:
* How controversial or discussion-worthy the topic is
* Whether it involves a major company, personality, or breakthrough
* Freshness and relevance to current industry conversations
* NOTE: These are ESTIMATED signals based on topic analysis, not real platform metrics

4. Platform Sensitivity
Adjust scoring based on platform:
* LinkedIn → professional insights, thought leadership, career impact
* Reddit → deep discussions, technical depth, community relevance
* X → fast-moving updates, hot takes, announcements
* Instagram → visual trends, lifestyle, brand moments

5. Impact Scoring (CRITICAL)
For each trend, calculate an estimated impact score (0 to 1) based on:
* Discussion-worthiness (how likely it is to spark conversation)
* Cross-industry relevance
* Freshness (recency)
* Relevance to the user's genre and keywords
* Be conservative and honest — scores above 0.8 should only be given to truly exceptional topics

6. Insight Extraction
For each trend:
* Identify WHY it is discussion-worthy
* Extract the content angle (NOT just the headline)
* Highlight what makes it valuable for posting on ${target_platform}

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No markdown, no extra text, no code fences.

{
  "trends": [
    {
      "topic": "",
      "summary": "",
      "platforms": ["${target_platform}"],
      "impact_score": 0.0,
      "confidence": 0.0,
      "engagement_signals": {
        "likes": 0,
        "comments": 0,
        "shares": 0,
        "velocity": 0.0
      },
      "reasoning": "",
      "suggested_angle": ""
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT CONSTRAINTS
━━━━━━━━━━━━━━━━━━━━━━

* Do NOT hallucinate data or fabricate engagement numbers
* Do NOT include generic trends unrelated to the user's genre
* Do NOT output vague summaries
* Keep topics concise (max 10–12 words)
* Ensure trends are actionable for content creation
* Return at most ${max_trends} trends, ordered by impact_score descending
* If data is insufficient, return fewer but genuinely high-confidence trends

If the input data is too weak, noisy, or unrelated to the user's genre, return an empty trends array rather than fabricating results.`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Clean any accidental markdown fences
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);

      if (!parsed.trends || !Array.isArray(parsed.trends)) {
        throw new Error("Invalid trend intelligence response structure");
      }

      // Normalize and add legacy fields for backward compatibility
      return parsed.trends.map((t: TrendAnalysis) => ({
        ...t,
        velocity_score: Math.round(t.impact_score * 100),
        insight: t.reasoning,
        title: t.topic,
        category: genre,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[GeminiService] Trend intelligence analysis failed:", msg);
      // FIX: Instead of silently returning random fallback data, propagate the error
      // so the API endpoint can return a proper error response to the client
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Legacy: basic velocity score analyzer (used by older code paths)
  // ─────────────────────────────────────────────────────────────────────────
  async analyzeTrendPotential(articles: RawArticle[], userId?: string): Promise<TrendAnalysis[]> {
    const model = await this.getModel(userId);
    // FIX: was calling fallbackAnalysis (random scores); now throws AI_UNAVAILABLE
    if (!model) {
      console.warn("[GeminiService] analyzeTrendPotential — no model, throwing AI_UNAVAILABLE");
      throw new Error("AI_UNAVAILABLE");
    }

    try {
      const prompt = `Analyze the following news headlines for their potential to be viral LinkedIn discussion topics.
Format the output as a JSON array of objects with 'index', 'velocity_score' (0-100), 'reason', and 'suggested_angle'.
High scores should be given to: Controversial tech topics, AI breakthroughs, Career advice, Remote work debates.

IMPORTANT: Base scores on realistic assessment. Do not give high scores to generic or uninteresting headlines.

Headlines:
${articles.map((a, i) => `${i}: ${a.title}`).join("\n")}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const analysis = JSON.parse(jsonStr);

      return articles.map((article, index) => {
        const insight = analysis.find((a: { index: number }) => a.index === index);
        return {
          ...article,
          topic: article.title,
          summary: article.description || "",
          platforms: ["linkedin"],
          impact_score: insight ? insight.velocity_score / 100 : 0,
          confidence: 0.7,
          engagement_signals: { likes: 0, comments: 0, shares: 0, velocity: 0 },
          reasoning: insight?.reason || "No analysis available",
          suggested_angle: insight?.suggested_angle || "",
          velocity_score: insight ? insight.velocity_score : 0,
          insight: insight ? insight.reason : "No analysis available",
          title: article.title,
          category: article.category || "General",
        };
      });
    } catch (error: unknown) {
      console.error("[GeminiService] analyzeTrendPotential failed:", error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fallback state — used only for graceful UI messaging, NOT for scoring
  // FIX: Math.random() removed entirely. Returns zero-scored items tagged as
  // unscored so the UI can show "Requires AI key to score" instead of fake data.
  // ─────────────────────────────────────────────────────────────────────────
  buildUnscoredFallback(articles: RawArticle[], genre: string): TrendAnalysis[] {
    return articles.slice(0, 10).map((a) => ({
      topic: a.title,
      summary: a.description || a.title,
      platforms: ["linkedin"],
      impact_score: 0,           // ← honest zero, not random
      confidence: 0,             // ← honest zero
      engagement_signals: { likes: 0, comments: 0, shares: 0, velocity: 0 },
      reasoning: "AI scoring unavailable — Gemini API key not configured. These articles require manual review.",
      suggested_angle: `Consider discussing: "${a.title}" from the perspective of how it affects your industry.`,
      velocity_score: 0,         // ← honest zero
      insight: "No AI scoring available",
      title: a.title,
      link: a.link,
      category: genre,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Draft generator with platform-specific formatting + length validation
  // ─────────────────────────────────────────────────────────────────────────
  async generateDraft(
    topic: string,
    context: string,
    userContext?: Record<string, string>,
    userId?: string,
    platform: string = "linkedin"
  ) {
    const model = await this.getModel(userId);

    // FIX: was returning `[Draft] Insights on ${topic}. ${context}` — a template
    // string masquerading as AI content. Now throws so callers can handle properly.
    if (!model) {
      throw new Error("AI_UNAVAILABLE");
    }

    // Platform character limits for the draft prompt
    const charLimit = PLATFORM_CHAR_LIMITS[platform.toLowerCase()] || 3000;
    const wordTarget = platform.toLowerCase() === "twitter" || platform.toLowerCase() === "x"
      ? "Under 60 words (hard limit: 280 characters)"
      : platform.toLowerCase() === "linkedin"
      ? "150–300 words (max ~3000 characters)"
      : platform.toLowerCase() === "reddit"
      ? "200–500 words — Reddit rewards detailed, insightful posts"
      : platform.toLowerCase() === "instagram"
      ? "Under 150 words — Instagram captions are short and punchy"
      : `Under ${Math.floor(charLimit / 6)} words`;

    try {
      const { role, niche, goals, bio } = userContext || {};

      const personalizationSection = userContext
        ? `
Target Audience Niche: ${niche || "General Professional"}
Author Role: ${role || "Thought Leader"}
Author Bio: "${bio || ""}"
Author Goals: ${goals || "Engagement and Growth"}

INSTRUCTIONS:
- Adopt a persona matching the Author Role and Bio.
- Write specifically for the Target Audience Niche.
- Ensure the tone aligns with the Author Goals.`
        : "";

      // FIX: Platform-specific formatting rules now enforced in the prompt
      const platformRules = getPlatformFormatRules(platform);

      const prompt = `Write a high-engagement ${platform} post about: "${topic}".
Context and inspiration: "${context}".

${personalizationSection}

━━━ PLATFORM FORMATTING RULES (${platform.toUpperCase()}) ━━━
${platformRules}

━━━ GENERAL RULES ━━━
Length: ${wordTarget}
Style: Authentic, engaging, platform-native
Structure: Hook → Key Insight(s) → Call to Action
Do NOT include hashtags (they will be added separately if configured).
Do NOT use corporate jargon or generic filler phrases.
Do NOT fabricate statistics or facts not supported by the provided context.

Output ONLY the post text. No meta-commentary, no "Here is your post:", no quotes around the output.`;

      const result = await model.generateContent(prompt);
      const draft = result.response.text().trim();

      // FIX: Post-generation character limit enforcement
      return enforcePlatformCharLimit(draft, platform);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[GeminiService] generateDraft failed:", msg);
      throw error;
    }
  }
}

// ─── Platform format rules ────────────────────────────────────────────────────
function getPlatformFormatRules(platform: string): string {
  switch (platform.toLowerCase()) {
    case "twitter":
    case "x":
      return `- Maximum 280 characters (hard limit)
- One sharp idea per tweet — no rambling
- Conversational, punchy, and direct
- Rhetorical questions or bold statements work well as hooks
- Avoid em-dashes and corporate speak`;

    case "linkedin":
      return `- Start with a strong single-sentence hook on its own line
- Use short paragraphs (1-3 lines each) for readability
- Include a clear professional insight or lesson
- End with an open-ended question to drive comments
- Avoid bullet points unless listing 3+ items`;

    case "reddit":
      return `- Reddit values authenticity and genuine expertise — avoid marketing language
- Write in first-person, sharing real experience or deep analysis
- Structure: Context/Background → Main Point → Evidence → Discussion invite
- Posts that ask for community perspective perform best
- Avoid overly promotional language — it will be downvoted`;

    case "instagram":
      return `- Start with a captivating first line (visible before "more" cutoff at ~125 chars)
- Short sentences and line breaks for mobile readability
- Conversational and personal tone
- End with a direct question or CTA to drive comments`;

    default:
      return `- Write in a clear, engaging, platform-appropriate style
- Lead with the most important insight
- Keep it concise and actionable`;
  }
}

// ─── Post-generation char limit enforcement ───────────────────────────────────
function enforcePlatformCharLimit(content: string, platform: string): string {
  const limit = PLATFORM_CHAR_LIMITS[platform.toLowerCase()];
  if (!limit) return content;

  if (content.length <= limit) return content;

  // For Twitter: hard truncate at word boundary before limit
  if (platform.toLowerCase() === "twitter" || platform.toLowerCase() === "x") {
    const truncated = content.substring(0, limit - 3);
    const lastSpace = truncated.lastIndexOf(" ");
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "…";
  }

  // For other platforms: log a warning but don't truncate (drafts go to approval)
  console.warn(
    `[GeminiService] Draft for ${platform} is ${content.length} chars, exceeds soft limit of ${limit}. ` +
    `Returning as-is — approval workflow will show character warning.`
  );
  return content;
}

export const geminiService = new GeminiService();
