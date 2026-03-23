"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowService = exports.WorkflowService = exports.postGenerationWorkflow = exports.WorkflowState = void 0;
const langgraph_1 = require("@langchain/langgraph");
const google_genai_1 = require("@langchain/google-genai");
const messages_1 = require("@langchain/core/messages");
// 1. Define State
exports.WorkflowState = langgraph_1.Annotation.Root({
    topic: (0, langgraph_1.Annotation)(),
    platform: (0, langgraph_1.Annotation)(),
    userContext: (0, langgraph_1.Annotation)(),
    parameters: (0, langgraph_1.Annotation)(),
    insight: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y !== null && y !== void 0 ? y : x,
        default: () => "",
    }),
    draft: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y !== null && y !== void 0 ? y : x,
        default: () => "",
    }),
    finalPost: (0, langgraph_1.Annotation)({
        reducer: (x, y) => y !== null && y !== void 0 ? y : x,
        default: () => "",
    }),
});
// 2. Define Nodes
const analyzeNode = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const model = new google_genai_1.ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.7,
        apiKey: process.env.GEMINI_API_KEY,
        maxRetries: 3,
    });
    const p = state.parameters || {};
    const sysMsg = new messages_1.SystemMessage("You are an expert social media strategist.");
    const msg = new messages_1.HumanMessage(`Analyze this topic for a ${state.platform} post: "${state.topic}".
  Additional context: ${state.insight || "None"}
  Target Audience: ${p.target_audience || "General"}
  Provide a brief strategy (1-2 sentences) on how to approach this post.`);
    const response = yield model.invoke([sysMsg, msg]);
    return { insight: response.content };
});
const draftNode = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const model = new google_genai_1.ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        temperature: 0.8,
        apiKey: process.env.GEMINI_API_KEY,
        maxRetries: 3,
    });
    const p = state.parameters || {};
    const u = state.userContext || {};
    const sysMsg = new messages_1.SystemMessage(`You are an expert ghostwriter creating content for ${state.platform}.
  Author Role: ${u.role || "Professional"}
  Author Bio: ${u.bio || ""}
  Author Goals: ${u.goals || ""}
  Tone/Voice Preset: ${p.voice_preset || "Professional"}
  Professionalism Level: ${p.professionalism || "Balanced"}
  Vibe: ${p.vibe_check || "Engaging"}
  `);
    const msg = new messages_1.HumanMessage(`Write a ${p.length || "medium"} length social media post.
  Topic: ${state.topic}
  Strategy Insight: ${state.insight}
  Primary Focus: ${p.primary_focus || "General"}
  Do not include hashtags yet.`);
    const response = yield model.invoke([sysMsg, msg]);
    return { draft: response.content };
});
const formatNode = (state) => __awaiter(void 0, void 0, void 0, function* () {
    const p = state.parameters || {};
    let finalPost = state.draft;
    if (p.automated_hashtags || p.auto_generate_tags) {
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            temperature: 0.3,
            apiKey: process.env.GEMINI_API_KEY,
            maxRetries: 3,
        });
        const msg = new messages_1.HumanMessage(`Add 3-5 highly relevant hashtags to this post, keeping the original text exactly the same.
    Only output the original text followed by the hashtags.
    
    Post:
    ${state.draft}`);
        const response = yield model.invoke([msg]);
        finalPost = response.content;
    }
    return { finalPost };
});
// 3. Build Graph
const builder = new langgraph_1.StateGraph(exports.WorkflowState)
    .addNode("analyze", analyzeNode)
    .addNode("generateDraft", draftNode)
    .addNode("format", formatNode)
    .addEdge(langgraph_1.START, "analyze")
    .addEdge("analyze", "generateDraft")
    .addEdge("generateDraft", "format")
    .addEdge("format", langgraph_1.END);
exports.postGenerationWorkflow = builder.compile();
class WorkflowService {
    generatePost(payload, userContext, insight) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const result = yield exports.postGenerationWorkflow.invoke(initialState, {
                configurable: { thread_id: Date.now().toString() },
            });
            return result.finalPost || result.draft;
        });
    }
}
exports.WorkflowService = WorkflowService;
exports.workflowService = new WorkflowService();
