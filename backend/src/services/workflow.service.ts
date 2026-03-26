import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { keysService } from "./keys.service";

// 1. Define State
export const WorkflowState = Annotation.Root({
  topic: Annotation<string>(),
  platform: Annotation<string>(),
  userContext: Annotation<Record<string, any>>(),
  parameters: Annotation<Record<string, any>>(),
  insight: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  draft: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  finalPost: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

// 2. Define Nodes
const analyzeNode = async (state: typeof WorkflowState.State) => {
  const userId = state.userContext?.id;
  const dbKey = await keysService.getKey(userId, 'gemini');
  const apiKey = dbKey || process.env.GEMINI_API_KEY;

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.5,  // FIX: was 0.7 — lowered for more reliable strategic analysis
    apiKey,
    maxRetries: 3,
  });

  const p = state.parameters || {};
  const sysMsg = new SystemMessage("You are an expert social media strategist.");
  const msg = new HumanMessage(`Analyze this topic for a ${state.platform} post: "${state.topic}".
  Additional context: ${state.insight || "None"}
  Target Audience: ${p.target_audience || "General"}
  Provide a brief strategy (1-2 sentences) on how to approach this post.`);

  const response = await model.invoke([sysMsg, msg]);
  return { insight: response.content as string };
};

const draftNode = async (state: typeof WorkflowState.State) => {
  const userId = state.userContext?.id;
  const dbKey = await keysService.getKey(userId, 'gemini');
  const apiKey = dbKey || process.env.GEMINI_API_KEY;

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.55, // FIX: was 0.8 — high temp causes hallucination of industry facts
    apiKey,
    maxRetries: 3,
  });

  const p = state.parameters || {};
  const u = state.userContext || {};

  // Platform-specific formatting guidance injected into the system prompt
  const platformRules: Record<string, string> = {
    linkedin: "Use short paragraphs, start with a strong single-line hook, end with an open question.",
    twitter:  "HARD LIMIT: 280 characters. One punchy idea. No em-dashes. Be direct.",
    x:        "HARD LIMIT: 280 characters. One punchy idea. No em-dashes. Be direct.",
    reddit:   "Be authentic, detailed, and genuinely helpful. Avoid marketing language — Reddit downvotes promotional posts.",
    instagram: "Start with a hook in the first 125 chars. Short sentences. Personal and visual.",
    youtube:  "Engaging video description optimized for search. Include watch hook in first 2 lines.",
  };
  const platformGuidance = platformRules[state.platform?.toLowerCase() || "linkedin"] || platformRules.linkedin;

  const sysMsg = new SystemMessage(`You are an expert ghostwriter creating authentic content for ${state.platform}.
  Author Role: ${u.role || "Professional"}
  Author Bio: ${u.bio || ""}
  Author Goals: ${u.goals || ""}
  Tone/Voice Preset: ${p.voice_preset || "Professional"}
  Professionalism Level: ${p.professionalism || "Balanced"}
  Vibe: ${p.vibe_check || "Engaging"}

  PLATFORM RULES: ${platformGuidance}

  CRITICAL: Do NOT fabricate statistics, study results, or specific data points not present in the provided context.
  Write in an authentic, human voice. Avoid corporate jargon and generic filler phrases.
  `);

  const msg = new HumanMessage(`Write a ${p.length || "medium"} length social media post.
  Topic: ${state.topic}
  Strategy Insight: ${state.insight}
  Primary Focus: ${p.primary_focus || "General"}
  Output ONLY the post text. No meta-commentary or quotes.
  Do not include hashtags yet.`);

  const response = await model.invoke([sysMsg, msg]);
  return { draft: response.content as string };
};

const formatNode = async (state: typeof WorkflowState.State) => {
  const userId = state.userContext?.id;
  const dbKey = await keysService.getKey(userId, 'gemini');
  const apiKey = dbKey || process.env.GEMINI_API_KEY;

  const p = state.parameters || {};
  let finalPost = state.draft;

  if (p.automated_hashtags || p.auto_generate_tags) {
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.3,
      apiKey,
      maxRetries: 3,
    });
    const msg = new HumanMessage(`Add 3-5 highly relevant hashtags to this post, keeping the original text exactly the same.
    Only output the original text followed by the hashtags.
    
    Post:
    ${state.draft}`);
    const response = await model.invoke([msg]);
    finalPost = response.content as string;
  }

  return { finalPost };
};

// 3. Build Graph
const builder = new StateGraph(WorkflowState)
  .addNode("analyze", analyzeNode)
  .addNode("generateDraft", draftNode)
  .addNode("format", formatNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", "generateDraft")
  .addEdge("generateDraft", "format")
  .addEdge("format", END);

export const postGenerationWorkflow = builder.compile();

export class WorkflowService {
  async generatePost(payload: Record<string, any>, userContext?: Record<string, any>, insight?: string) {
    console.log(`[LangGraph Workflow] Starting post generation for topic: "${payload.topic}"`);
    const initialState = {
      topic: payload.topic,
      platform: payload.platform || "linkedin",
      parameters: payload,
      userContext: userContext || {},
      insight: insight || "",
      draft: "",
      finalPost: "",
    };

    // The graph execution is automatically traced by LangSmith if LANGCHAIN_TRACING_V2 is set
    const result = await postGenerationWorkflow.invoke(initialState, {
      configurable: { thread_id: Date.now().toString() },
    });

    return result.finalPost || result.draft;
  }
}

export const workflowService = new WorkflowService();
