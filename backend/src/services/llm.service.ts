import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { keysService } from "./keys.service";
import { supabase } from "../db";

export type LlmProvider = "gemini" | "openai" | "claude";

export interface GenerateOptions {
  userId: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
}

/**
 * Unified LLM service that routes to Gemini, OpenAI, or Claude
 * based on the user's preferred_ai_model setting.
 *
 * Priority order for key resolution:
 * 1. User's own API key for their preferred provider
 * 2. Server-level env var for the same provider
 * 3. Fallback to Gemini (server key) if nothing else is available
 */
export class LlmService {
  // ─── Get user's preferred provider ───────────────────────────────────────
  async getPreferredProvider(userId: string): Promise<LlmProvider> {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_ai_model")
        .eq("id", userId)
        .single();
      const pref = data?.preferred_ai_model as LlmProvider | null;
      if (pref && ["gemini", "openai", "claude"].includes(pref)) return pref;
    } catch {
      // fallthrough to default
    }
    return "gemini";
  }

  // ─── Resolve the best available key for a given provider ────────────────
  private async resolveKey(
    userId: string,
    provider: LlmProvider
  ): Promise<string | null> {
    // User's own saved key takes priority
    const userKey = await keysService.getKey(userId, provider);
    if (userKey) return userKey;

    // Fall back to server-level env var
    const envMap: Record<LlmProvider, string | undefined> = {
      gemini: process.env.GEMINI_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      claude: process.env.ANTHROPIC_API_KEY,
    };
    return envMap[provider] ?? null;
  }

  // ─── Core generation method ──────────────────────────────────────────────
  /**
   * Generate text using the user's preferred AI provider.
   * Falls back to Gemini (server key) if the preferred provider has no key.
   */
  async generate(opts: GenerateOptions): Promise<string> {
    const { userId, prompt, systemPrompt, temperature = 0.55 } = opts;
    const provider = await this.getPreferredProvider(userId);

    // Attempt preferred provider first
    let result = await this.tryGenerate(
      provider,
      userId,
      prompt,
      systemPrompt,
      temperature
    );
    if (result !== null) return result;

    // Fallback to Gemini (server key) if preferred provider failed
    if (provider !== "gemini") {
      console.warn(
        `[LlmService] ${provider} key unavailable for user ${userId}, falling back to Gemini`
      );
      result = await this.tryGenerate(
        "gemini",
        userId,
        prompt,
        systemPrompt,
        temperature,
        true // skipUserKey — use server key only
      );
    }

    if (result === null) throw new Error("AI_UNAVAILABLE");
    return result;
  }

  private async tryGenerate(
    provider: LlmProvider,
    userId: string,
    prompt: string,
    systemPrompt?: string,
    temperature = 0.55,
    skipUserKey = false
  ): Promise<string | null> {
    try {
      const key = skipUserKey
        ? process.env.GEMINI_API_KEY ?? null
        : await this.resolveKey(userId, provider);

      if (!key) return null;

      if (provider === "gemini") {
        return await this.callGemini(key, prompt, temperature);
      } else if (provider === "openai") {
        return await this.callOpenAI(key, prompt, systemPrompt, temperature);
      } else if (provider === "claude") {
        return await this.callClaude(key, prompt, systemPrompt, temperature);
      }
    } catch (err) {
      console.error(`[LlmService] ${provider} call failed:`, err);
    }
    return null;
  }

  // ─── Provider implementations ────────────────────────────────────────────
  private async callGemini(
    apiKey: string,
    prompt: string,
    temperature: number
  ): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { temperature },
    });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  private async callOpenAI(
    apiKey: string,
    prompt: string,
    systemPrompt?: string,
    temperature = 0.55
  ): Promise<string> {
    const openai = new OpenAI({ apiKey });
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature,
      max_tokens: 2000,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  private async callClaude(
    apiKey: string,
    prompt: string,
    systemPrompt?: string,
    temperature = 0.55
  ): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content[0];
    if (block.type === "text") return block.text.trim();
    return "";
  }

  // ─── Provider status helper (for UI) ─────────────────────────────────────
  async getProviderStatus(userId: string): Promise<{
    preferred: LlmProvider;
    available: Record<LlmProvider, boolean>;
  }> {
    const preferred = await this.getPreferredProvider(userId);
    const providers: LlmProvider[] = ["gemini", "openai", "claude"];
    const available: Record<LlmProvider, boolean> = {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
    };

    for (const p of providers) {
      const userKey = await keysService.getKey(userId, p);
      if (userKey) available[p] = true;
    }

    return { preferred, available };
  }
}

export const llmService = new LlmService();
