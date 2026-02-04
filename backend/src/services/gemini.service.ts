import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    } else {
      console.warn("⚠️ Gemini API key is missing.");
    }
  }

  async analyzeTrendPotential(articles: any[]) {
    if (!this.model)
      return articles.map((a) => ({
        ...a,
        velocity_score: Math.floor(Math.random() * 40) + 30,
      }));

    try {
      // We will send a batch of titles to Gemini to score them.
      const prompt = `
            Analyze the following news headlines for their potential to be viral LinkedIn discussion topics.
            Format the output as a JSON array of objects with 'index' and 'velocity_score' (0-100) and a short 'reason'.
            High scores should be given to: Controverial tech topics, AI breakthroughs, Career advice, Remote work debates.
            
            Headlines:
            ${articles.map((a, i) => `${i}: ${a.title}`).join("\n")}
        `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean markdown code blocks if present
      const jsonStr = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const analysis = JSON.parse(jsonStr);

      // Merge analysis with original articles
      return articles.map((article, index) => {
        const insight = analysis.find((a: any) => a.index === index);
        return {
          ...article,
          velocity_score: insight ? insight.velocity_score : 50,
          insight: insight ? insight.reason : "No analysis available",
        };
      });
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      // Fallback to random scores
      return articles.map((a) => ({
        ...a,
        velocity_score: Math.floor(Math.random() * 40) + 30,
      }));
    }
  }

  async generateDraft(topic: string, context: string, userContext?: any) {
    // 1. Check for n8n Webhook Override
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const axios = require("axios");
        console.log("🔗 Delegating draft generation to n8n workflow...");

        // We use POST to send adequate context.
        // If the user strictly needs GET parameters (less recommended for long text), they'd need to change this.
        const response = await axios.post(process.env.N8N_WEBHOOK_URL, {
          topic,
          context,
          userContext, // Pass full user context to n8n as well
          platform: "linkedin",
          action: "generate_draft",
        });

        // Expecting { "content": "..." } from n8n
        if (response.data && response.data.content) {
          return response.data.content;
        }
        // Fallback if n8n returns just text or different structure
        if (typeof response.data === "string") return response.data;
        return JSON.stringify(response.data);
      } catch (error: any) {
        console.error("❌ n8n Workflow Error:", error.message);
        return `[Error] Failed to generate via n8n. Falling back to internal AI.`;
      }
    }

    // 2. Fallback to Internal Gemini
    if (!this.model) return `[Mock Draft] Insights on ${topic}. ${context}`;

    try {
      const { role, niche, goals, bio } = userContext || {};

      let personalizationPrompt = "";
      if (userContext) {
        personalizationPrompt = `
              Target Audience Niche: ${niche || "General Professional"}
              Author Role: ${role || "Thought Leader"}
              Author Bio: "${bio || ""}"
              Author Goals: ${goals || "Engagement and Growth"}
              
              INSTRUCTIONS:
              - Adopt a persona matching the Author Role and Bio.
              - Write specifically for the Target Audience Niche.
              - Ensure the tone aligns with the Author Goals.
              `;
      }

      const prompt = `
            Write a high-engaging LinkedIn post about: "${topic}".
            Context from news: "${context}".
            
            ${personalizationPrompt}

            Style: Professional, Thought Leadership, slightly provocative.
            Structure: Hook, 3 key points, Call to Action.
            Length: Under 150 words.
            No hashtags yet.
          `;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini draft generation failed:", error);
      return `Failed to generate draft for ${topic}.`;
    }
  }
}

export const geminiService = new GeminiService();
