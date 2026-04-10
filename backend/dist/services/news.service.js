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
const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const REDDIT_PUBLIC_BASE = 'https://www.reddit.com';
// Subreddit mapping by genre/niche
const NICHE_SUBREDDITS = {
    technology: ['technology', 'programming', 'tech', 'artificial'],
    ai: ['artificial', 'MachineLearning', 'ChatGPT', 'singularity'],
    business: ['business', 'entrepreneur', 'startups', 'smallbusiness'],
    finance: ['finance', 'investing', 'personalfinance', 'stocks'],
    marketing: ['marketing', 'digital_marketing', 'socialmedia', 'SEO'],
    health: ['health', 'science', 'medicine', 'fitness'],
    science: ['science', 'Physics', 'biology', 'chemistry'],
    default: ['technology', 'programming', 'business'],
};
class NewsService {
    constructor() {
        this.apiKey = process.env.NEWSDATA_API_KEY || '';
    }
    /**
     * Fetch news articles for a given query from NewsData.io.
     * FIX: Added broadFallback — if the specific query returns < 3 results,
     * retries with a broader single-keyword query.
     */
    fetchNews(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, maxResults = 20) {
            if (!this.apiKey) {
                console.warn('[NewsService] ⚠️ NEWSDATA_API_KEY is not configured. Trend scanning requires this key.');
                return [];
            }
            try {
                const results = yield this.queryApi(query, maxResults);
                if (results.length < 3) {
                    console.warn(`[NewsService] Specific query "${query}" returned only ${results.length} result(s). Trying broader query.`);
                    const broadQuery = query.split(' ')[0];
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
    /**
     * Fetch hot posts from relevant subreddits (FREE — no auth required).
     * Uses Reddit's public JSON API: /r/{subreddit}/hot.json
     */
    fetchRedditHotPosts() {
        return __awaiter(this, arguments, void 0, function* (niches = []) {
            var _a, _b, _c, _d;
            const allArticles = [];
            // Map niches to relevant subreddits
            const subreddits = new Set();
            for (const niche of niches) {
                const key = niche.toLowerCase();
                const mapped = NICHE_SUBREDDITS[key] || NICHE_SUBREDDITS['default'];
                mapped.forEach(s => subreddits.add(s));
            }
            if (subreddits.size === 0) {
                NICHE_SUBREDDITS['default'].forEach(s => subreddits.add(s));
            }
            // Limit to 3 subreddits to avoid rate limiting
            const selectedSubs = Array.from(subreddits).slice(0, 3);
            for (const subreddit of selectedSubs) {
                try {
                    const response = yield axios_1.default.get(`${REDDIT_PUBLIC_BASE}/r/${subreddit}/hot.json?limit=10`, {
                        headers: {
                            'User-Agent': 'webapp:ai-canvas-trendfetch:v1.0',
                        },
                        timeout: 8000,
                    });
                    const posts = ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.children) || [];
                    for (const { data: post } of posts) {
                        if (post.is_self || post.stickied)
                            continue; // skip ads/stickied
                        allArticles.push({
                            title: post.title,
                            description: ((_c = post.selftext) === null || _c === void 0 ? void 0 : _c.substring(0, 200)) || `🔥 ${(_d = post.ups) === null || _d === void 0 ? void 0 : _d.toLocaleString()} upvotes on r/${subreddit}`,
                            link: `https://reddit.com${post.permalink}`,
                            source_id: `reddit_${subreddit}`,
                            category: 'Social Discussion',
                            source_type: 'reddit',
                        });
                    }
                    console.log(`[NewsService] Reddit r/${subreddit}: ${posts.length} posts fetched`);
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.warn(`[NewsService] Reddit r/${subreddit} fetch failed: ${msg}`);
                }
            }
            return allArticles;
        });
    }
    /**
     * Fetch top stories from Hacker News (FREE — official public API).
     * Uses Firebase REST API: no auth required.
     */
    fetchHackerNewsTop() {
        return __awaiter(this, arguments, void 0, function* (limit = 15) {
            var _a;
            try {
                // Step 1: Get list of top story IDs
                const { data: ids } = yield axios_1.default.get(`${HN_API_BASE}/topstories.json`, { timeout: 8000 });
                const topIds = ids.slice(0, limit);
                // Step 2: Fetch individual story details in parallel
                const stories = yield Promise.allSettled(topIds.map(id => axios_1.default.get(`${HN_API_BASE}/item/${id}.json`, { timeout: 5000 })));
                const articles = [];
                for (const result of stories) {
                    if (result.status !== 'fulfilled')
                        continue;
                    const item = result.value.data;
                    if (!item || item.type !== 'story' || !item.title)
                        continue;
                    articles.push({
                        title: item.title,
                        description: item.url
                            ? `HackerNews: ${item.score || 0} points · ${item.descendants || 0} comments`
                            : (_a = item.text) === null || _a === void 0 ? void 0 : _a.substring(0, 200),
                        link: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
                        source_id: 'hackernews',
                        category: 'Tech / Startup',
                        source_type: 'hackernews',
                    });
                }
                console.log(`[NewsService] HackerNews: ${articles.length} stories fetched`);
                return articles;
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.warn('[NewsService] HackerNews fetch failed:', msg);
                return [];
            }
        });
    }
    /**
     * Unified multi-source fetch: merges NewsData.io + Reddit + HackerNews.
     * Deduplicates by title similarity (first 40 chars).
     */
    fetchAllSources(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, niches = [], maxResults = 20) {
            console.log(`[NewsService] Fetching from all sources for query: "${query}"`);
            // Fetch all sources in parallel
            const [newsItems, redditItems, hnItems] = yield Promise.allSettled([
                this.fetchNews(query, maxResults),
                this.fetchRedditHotPosts(niches),
                this.fetchHackerNewsTop(15),
            ]);
            const allItems = [
                ...(newsItems.status === 'fulfilled' ? newsItems.value : []),
                ...(redditItems.status === 'fulfilled' ? redditItems.value : []),
                ...(hnItems.status === 'fulfilled' ? hnItems.value : []),
            ];
            // Deduplicate by title prefix (first 40 chars, lowercased)
            const seen = new Set();
            const deduplicated = allItems.filter(article => {
                const key = article.title.toLowerCase().substring(0, 40);
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
            console.log(`[NewsService] Total unique articles from all sources: ${deduplicated.length}`);
            return deduplicated.slice(0, maxResults + 10); // give AI more data to work with
        });
    }
    queryApi(query, maxResults) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield axios_1.default.get(NEWSDATA_BASE_URL, {
                params: {
                    apikey: this.apiKey,
                    q: query,
                    language: 'en',
                },
                timeout: 10000,
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
                    source_type: 'newsdata',
                }));
            }
            return [];
        });
    }
}
exports.NewsService = NewsService;
exports.newsService = new NewsService();
