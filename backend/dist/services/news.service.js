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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsService = exports.NewsService = void 0;
const axios_1 = __importDefault(require("axios"));
const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/news';
class NewsService {
    constructor() {
        this.apiKey = process.env.NEWSDATA_API_KEY || '';
    }
    /**
     * Fetch news articles for a given query.
     * FIX: Added broadFallback — if the specific query returns < 3 results,
     * retries with a broader single-keyword query. This prevents the AI from
     * receiving near-empty inputs and producing no trends or low-quality results.
     */
    fetchNews(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, maxResults = 20) {
            if (!this.apiKey) {
                console.warn('[NewsService] ⚠️ NEWSDATA_API_KEY is not configured. Trend scanning requires this key.');
                return [];
            }
            try {
                const results = yield this.queryApi(query, maxResults);
                // FIX: If the specific query returns fewer than 3 articles, try a broader search
                if (results.length < 3) {
                    console.warn(`[NewsService] Specific query "${query}" returned only ${results.length} result(s). Trying broader query.`);
                    const broadQuery = query.split(' ')[0]; // use first keyword only
                    if (broadQuery && broadQuery !== query) {
                        const broadResults = yield this.queryApi(broadQuery, maxResults);
                        if (broadResults.length > results.length) {
                            console.log(`[NewsService] Broader query "${broadQuery}" returned ${broadResults.length} results.`);
                            return broadResults;
                        }
                    }
                }
                return results;
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error('[NewsService] Error fetching news:', msg);
                return [];
            }
        });
    }
    queryApi(query, maxResults) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(NEWSDATA_BASE_URL, {
                params: {
                    apikey: this.apiKey,
                    q: query,
                    language: 'en',
                    // FIX: Request more articles so the AI has richer input to work with
                    // NewsData.io free tier returns max 10 per call; paid tiers return up to 50
                },
                timeout: 10000, // FIX: Added timeout to prevent hanging requests
            });
            if (response.data && response.data.results) {
                return response.data.results.slice(0, maxResults).map((article) => ({
                    title: article.title,
                    description: article.description,
                    link: article.link,
                    pubDate: article.pubDate,
                    source_id: article.source_id,
                    category: Array.isArray(article.category) && article.category.length > 0
                        ? article.category[0]
                        : 'General',
                }));
            }
            return [];
        });
    }
}
exports.NewsService = NewsService;
exports.newsService = new NewsService();
