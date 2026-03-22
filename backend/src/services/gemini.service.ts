import { GoogleGenerativeAI } from "@google/generative-ai";

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
  genre: string;
  keywords: string[];
  target_platform: string;
  time_window?: string;
  platform_data: RawArticle[];
}

export interface RawArticle {
  title: string;
  description?: string;
  link?: string;
  source?: string;
  category?: string;
  published?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    } else {
      console.warn("⚠️ Gemini API key is missing.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Advanced Trend Intelligence Analyzer
  // ─────────────────────────────────────────────────────────────────────────
  async analyzeTrendIntelligence(input: TrendIntelligenceInput): Promise<TrendAnalysis[]> {
    const { genre, keywords, target_platform, time_window = "last 24 hours", platform_data } = input;

    if (!this.model) {
      console.warn("[GeminiService] Model not initialized, using fallback scoring.");
      return this.fallbackAnalysis(platform_data, genre);
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

    const prompt = `You are an expert cross-platform trend intelligence system specializing in identifying high-impact, discussion-worthy topics for professional social media platforms.

Your task is to analyze raw data collected from LinkedIn, Reddit, and X (Twitter) and identify the most impactful trends based on user-defined interests.

━━━━━━━━━━━━━━━━━━━━━━
INPUT CONTEXT
━━━━━━━━━━━━━━━━━━━━━━

User Preferences:
* Genre: ${genre}
* Keywords: ${keywords.join(", ") || "None specified"}
* Target Platform: ${target_platform}
* Time Window: ${time_window}

Raw Data:
${rawDataString}

━━━━━━━━━━━━━━━━━━━━━━
YOUR OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━

From the given data, extract, clean, analyze, and rank the most impactful trends that have a high probability of performing well on the target platform.

━━━━━━━━━━━━━━━━━━━━━━
ANALYSIS RULES
━━━━━━━━━━━━━━━━━━━━━━

1. Relevance Filtering
* Only keep topics strongly related to the user's genre and keywords
* Remove noise, memes, low-effort posts, or irrelevant discussions

2. Deduplication
* Merge similar topics across platforms into a single unified trend
* Normalize wording into a clean topic phrase

3. Engagement Analysis
Evaluate each topic using:
* Likes / Upvotes
* Comments / Replies
* Shares / Retweets
* Engagement velocity (engagement relative to time)

4. Platform Sensitivity
Adjust scoring based on platform:
* LinkedIn → professional insights, thought leadership
* Reddit → deep discussions, technical depth
* X → fast-moving updates, announcements

5. Impact Scoring (CRITICAL)
For each trend, calculate an impact score (0 to 1) based on:
* Engagement strength
* Cross-platform presence
* Freshness (recency)
* Relevance to user

6. Insight Extraction
For each trend:
* Identify why it is trending
* Extract the discussion angle (NOT just the headline)
* Highlight what makes it valuable for posting

━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━

Return ONLY valid JSON. No markdown, no extra text, no code fences.

{
  "trends": [
    {
      "topic": "",
      "summary": "",
      "platforms": ["linkedin", "reddit", "x"],
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

* Do NOT hallucinate data
* Do NOT include generic trends
* Do NOT output vague summaries
* Keep topics concise (max 10–12 words)
* Ensure trends are actionable for content creation
* Return at most 5 trends, ordered by impact_score descending

If the input data is weak or insufficient, return fewer but high-confidence trends instead of low-quality results.`;

    try {
      const result = await this.model.generateContent(prompt);
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
    } catch (error) {
      console.error("[GeminiService] Trend intelligence analysis failed:", error);
      return this.fallbackAnalysis(platform_data, genre);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Legacy: basic velocity score analyzer (used by older code paths)
  // ─────────────────────────────────────────────────────────────────────────
  async analyzeTrendPotential(articles: RawArticle[]): Promise<TrendAnalysis[]> {
    if (!this.model) return this.fallbackAnalysis(articles, "General");

    try {
      const prompt = `Analyze the following news headlines for their potential to be viral LinkedIn discussion topics.
Format the output as a JSON array of objects with 'index', 'velocity_score' (0-100), 'reason', and 'suggested_angle'.
High scores should be given to: Controversial tech topics, AI breakthroughs, Career advice, Remote work debates.

Headlines:
${articles.map((a, i) => `${i}: ${a.title}`).join("\n")}`;

      const result = await this.model.generateContent(prompt);
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
          impact_score: insight ? insight.velocity_score / 100 : 0.5,
          confidence: 0.7,
          engagement_signals: { likes: 0, comments: 0, shares: 0, velocity: 0 },
          reasoning: insight?.reason || "No analysis available",
          suggested_angle: insight?.suggested_angle || "",
          velocity_score: insight ? insight.velocity_score : 50,
          insight: insight ? insight.reason : "No analysis available",
          title: article.title,
          category: article.category || "General",
        };
      });
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      return this.fallbackAnalysis(articles, "General");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Fallback when Gemini unavailable
  // ─────────────────────────────────────────────────────────────────────────
  private fallbackAnalysis(articles: RawArticle[], genre: string): TrendAnalysis[] {
    return articles.slice(0, 5).map((a) => ({
      topic: a.title,
      summary: a.description || a.title,
      platforms: ["linkedin"],
      impact_score: Math.random() * 0.4 + 0.4,
      confidence: 0.5,
      engagement_signals: { likes: 0, comments: 0, shares: 0, velocity: 0 },
      reasoning: "Fallback scoring — Gemini API unavailable",
      suggested_angle: `Discuss the implications of "${a.title}" for your industry audience.`,
      velocity_score: Math.floor(Math.random() * 40) + 30,
      insight: "No analysis available",
      title: a.title,
      link: a.link,
      category: genre,
    }));
  }

  async generateDraft(topic: string, context: string, userContext?: Record<string, string>) {
    if (!this.model) return `[Draft] Insights on ${topic}. ${context}`;

    try {
      const { role, niche, goals, bio } = userContext || {};

      const personalizationPrompt = userContext
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

      const prompt = `Write a high-engaging LinkedIn post about: "${topic}".
Context from news: "${context}".

${personalizationPrompt}

Style: Professional, Thought Leadership, slightly provocative.
Structure: Hook, 3 key points, Call to Action.
Length: Under 150 words.
No hashtags yet.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini draft generation failed:", error);
      return `Failed to generate draft for ${topic}.`;
    }
  }
}

export const geminiService = new GeminiService();
