import { keysService } from "./keys.service";
import { llmService } from "./llm.service";
import { supabase } from "../db";

// ─── Platform-specific formatting guidance ────────────────────────────────────
const PLATFORM_RULES: Record<string, string> = {
  linkedin:  "Use short paragraphs, start with a strong single-line hook, end with an open question. Professional tone.",
  twitter:   "HARD LIMIT: 280 characters. One punchy idea. No em-dashes. Be direct and memorable.",
  x:         "HARD LIMIT: 280 characters. One punchy idea. No em-dashes. Be direct and memorable.",
  reddit:    "Be authentic, detailed, and genuinely helpful. Avoid marketing language — Reddit downvotes promotional posts. First-person preferred.",
  instagram: "Start with a hook in the first 125 chars. Short sentences. Personal and visual. Emoji OK.",
  youtube:   "Engaging video description optimized for search. Include watch hook in first 2 lines.",
};

export interface PostPayload {
  topic: string;
  platform: string;
  target_audience?: string;
  voice_preset?: string;
  vibe_check?: string;
  professionalism?: string;
  length?: string;
  primary_focus?: string;
  automated_hashtags?: boolean;
  auto_generate_tags?: boolean;
  content_pillars?: string;
}

export interface UserContext {
  id: string;
  role?: string;
  bio?: string;
  goals?: string;
  niche?: string;
  full_name?: string;
  [key: string]: unknown;
}

export class WorkflowService {
  /**
   * Generate a social media post using the user's preferred AI provider.
   * Falls back to Gemini server key if no user key is available.
   */
  async generatePost(
    payload: PostPayload,
    userContext: UserContext,
    insight = ""
  ): Promise<string> {
    const userId = userContext.id;
    const platform = payload.platform || "linkedin";
    const platformGuidance = PLATFORM_RULES[platform.toLowerCase()] || PLATFORM_RULES.linkedin;

    // ── Step 1: Analyze the topic (strategic framing) ───────────────────────
    const analyzePrompt = `You are an expert social media strategist.
Analyze this topic for a ${platform} post: "${payload.topic}".
Additional context: ${insight || "None"}
Target Audience: ${payload.target_audience || "General"}
Provide a brief strategy (1-2 sentences) on how to approach this post with maximum impact.`;

    const strategy = await llmService.generate({
      userId,
      prompt: analyzePrompt,
      temperature: 0.5,
    });

    // ── Step 2: Draft the post ──────────────────────────────────────────────
    const systemPrompt = `You are an expert ghostwriter creating authentic content for ${platform}.
Author Role: ${userContext.role || "Professional"}
Author Bio: ${userContext.bio || ""}
Author Goals: ${userContext.goals || ""}
Tone/Voice Preset: ${payload.voice_preset || "Professional"}
Professionalism Level: ${payload.professionalism || "Balanced"}
Vibe: ${payload.vibe_check || "Engaging"}

PLATFORM RULES: ${platformGuidance}

CRITICAL: Do NOT fabricate statistics, study results, or specific data points not present in the provided context.
Write in an authentic, human voice. Avoid corporate jargon and generic filler phrases.`;

    const draftPrompt = `Write a ${payload.length || "medium"} length social media post.
Topic: ${payload.topic}
Strategy Insight: ${strategy}
Primary Focus: ${payload.primary_focus || "General"}
Output ONLY the post text. No meta-commentary or quotes.
Do not include hashtags yet.`;

    let finalPost = await llmService.generate({
      userId,
      prompt: draftPrompt,
      systemPrompt,
      temperature: 0.55,
    });

    // ── Step 3: Add hashtags if configured ─────────────────────────────────
    if (payload.automated_hashtags || payload.auto_generate_tags) {
      const hashtagPrompt = `Add 3-5 highly relevant hashtags to this post, keeping the original text exactly the same.
Only output the original text followed by the hashtags.

Post:
${finalPost}`;

      try {
        finalPost = await llmService.generate({
          userId,
          prompt: hashtagPrompt,
          temperature: 0.3,
        });
      } catch {
        // Non-critical: hashtag generation failure shouldn't break the draft
        console.warn("[WorkflowService] Hashtag addition failed, returning draft without hashtags.");
      }
    }

    return finalPost;
  }
}

export const workflowService = new WorkflowService();
