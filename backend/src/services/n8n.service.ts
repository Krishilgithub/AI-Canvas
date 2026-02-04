import axios from "axios";

export class N8nService {
  private webhookUrl: string;

  constructor() {
    // Default to a placeholder if not set, but log a warning.
    this.webhookUrl =
      process.env.N8N_WEBHOOK_URL ||
      "https://placeholder-n8n-url.com/webhook/generate-post";
    if (!process.env.N8N_WEBHOOK_URL) {
      console.warn("⚠️ N8N_WEBHOOK_URL is not set in backend/.env");
    }
  }

  /**
   * Triggers the n8n webhook to generate a LinkedIn post based on a topic.
   * @param topic The user-provided topic.
   * @param platform The platform (e.g., 'linkedin').
   * @returns The generated post content (and potentially other metadata).
   */
  async generatePost(
    topic: string,
    platform: string = "linkedin",
  ): Promise<string> {
    try {
      console.log(`[N8nService] Triggering generation for topic: "${topic}"`);

      const response = await axios.post(this.webhookUrl, {
        topic,
        platform,
      });

      // Assuming n8n returns standard JSON { "output": "Post content..." }
      // Adjust based on actual n8n workflow response structure
      const content =
        response.data.output || response.data.content || response.data.text;

      if (!content) {
        console.error("[N8nService] Invalid response from n8n:", response.data);
        throw new Error("No content returned from AI agent");
      }

      return content;
    } catch (error: any) {
      console.error("[N8nService] Error calling n8n:", error.message);
      // Fallback for demo if n8n is not actually reachable (optional)
      // throw error;
      // For now, let's throw so the controller handles it.
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}

export const n8nService = new N8nService();
