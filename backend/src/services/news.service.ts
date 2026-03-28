import axios from 'axios';

const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/news';
const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const REDDIT_PUBLIC_BASE = 'https://www.reddit.com';

export interface NewsArticle {
  title: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source_id?: string;
  category?: string;
  source_type?: 'newsdata' | 'reddit' | 'hackernews';
}

// Subreddit mapping by genre/niche
const NICHE_SUBREDDITS: Record<string, string[]> = {
  technology: ['technology', 'programming', 'tech', 'artificial'],
  ai: ['artificial', 'MachineLearning', 'ChatGPT', 'singularity'],
  business: ['business', 'entrepreneur', 'startups', 'smallbusiness'],
  finance: ['finance', 'investing', 'personalfinance', 'stocks'],
  marketing: ['marketing', 'digital_marketing', 'socialmedia', 'SEO'],
  health: ['health', 'science', 'medicine', 'fitness'],
  science: ['science', 'Physics', 'biology', 'chemistry'],
  default: ['technology', 'programming', 'business'],
};

export class NewsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEWSDATA_API_KEY || '';
  }

  /**
   * Fetch news articles for a given query from NewsData.io.
   * FIX: Added broadFallback — if the specific query returns < 3 results,
   * retries with a broader single-keyword query.
   */
  async fetchNews(query: string, maxResults: number = 20): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      console.warn('[NewsService] ⚠️ NEWSDATA_API_KEY is not configured. Trend scanning requires this key.');
      return [];
    }

    try {
      const results = await this.queryApi(query, maxResults);

      if (results.length < 3) {
        console.warn(`[NewsService] Specific query "${query}" returned only ${results.length} result(s). Trying broader query.`);
        const broadQuery = query.split(' ')[0];
        if (broadQuery && broadQuery !== query) {
          const broadResults = await this.queryApi(broadQuery, maxResults);
          if (broadResults.length > results.length) {
            console.log(`[NewsService] Broader query "${broadQuery}" returned ${broadResults.length} results.`);
            return broadResults;
          }
        }
      }

      return results;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[NewsService] Error fetching news:', msg);
      return [];
    }
  }

  /**
   * Fetch hot posts from relevant subreddits (FREE — no auth required).
   * Uses Reddit's public JSON API: /r/{subreddit}/hot.json
   */
  async fetchRedditHotPosts(niches: string[] = []): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];

    // Map niches to relevant subreddits
    const subreddits = new Set<string>();
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
        const response = await axios.get(
          `${REDDIT_PUBLIC_BASE}/r/${subreddit}/hot.json?limit=10`,
          {
            headers: {
              'User-Agent': 'webapp:ai-canvas-trendfetch:v1.0',
            },
            timeout: 8_000,
          }
        );

        const posts = response.data?.data?.children || [];
        for (const { data: post } of posts) {
          if (post.is_self || post.stickied) continue; // skip ads/stickied
          allArticles.push({
            title: post.title,
            description: post.selftext?.substring(0, 200) || `🔥 ${post.ups?.toLocaleString()} upvotes on r/${subreddit}`,
            link: `https://reddit.com${post.permalink}`,
            source_id: `reddit_${subreddit}`,
            category: 'Social Discussion',
            source_type: 'reddit',
          });
        }

        console.log(`[NewsService] Reddit r/${subreddit}: ${posts.length} posts fetched`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[NewsService] Reddit r/${subreddit} fetch failed: ${msg}`);
      }
    }

    return allArticles;
  }

  /**
   * Fetch top stories from Hacker News (FREE — official public API).
   * Uses Firebase REST API: no auth required.
   */
  async fetchHackerNewsTop(limit: number = 15): Promise<NewsArticle[]> {
    try {
      // Step 1: Get list of top story IDs
      const { data: ids } = await axios.get<number[]>(
        `${HN_API_BASE}/topstories.json`,
        { timeout: 8_000 }
      );

      const topIds = ids.slice(0, limit);

      // Step 2: Fetch individual story details in parallel
      const stories = await Promise.allSettled(
        topIds.map(id =>
          axios.get(`${HN_API_BASE}/item/${id}.json`, { timeout: 5_000 })
        )
      );

      const articles: NewsArticle[] = [];
      for (const result of stories) {
        if (result.status !== 'fulfilled') continue;
        const item = result.value.data;
        if (!item || item.type !== 'story' || !item.title) continue;

        articles.push({
          title: item.title,
          description: item.url
            ? `HackerNews: ${item.score || 0} points · ${item.descendants || 0} comments`
            : item.text?.substring(0, 200),
          link: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          source_id: 'hackernews',
          category: 'Tech / Startup',
          source_type: 'hackernews',
        });
      }

      console.log(`[NewsService] HackerNews: ${articles.length} stories fetched`);
      return articles;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[NewsService] HackerNews fetch failed:', msg);
      return [];
    }
  }

  /**
   * Unified multi-source fetch: merges NewsData.io + Reddit + HackerNews.
   * Deduplicates by title similarity (first 40 chars).
   */
  async fetchAllSources(query: string, niches: string[] = [], maxResults: number = 20): Promise<NewsArticle[]> {
    console.log(`[NewsService] Fetching from all sources for query: "${query}"`);

    // Fetch all sources in parallel
    const [newsItems, redditItems, hnItems] = await Promise.allSettled([
      this.fetchNews(query, maxResults),
      this.fetchRedditHotPosts(niches),
      this.fetchHackerNewsTop(15),
    ]);

    const allItems: NewsArticle[] = [
      ...(newsItems.status === 'fulfilled' ? newsItems.value : []),
      ...(redditItems.status === 'fulfilled' ? redditItems.value : []),
      ...(hnItems.status === 'fulfilled' ? hnItems.value : []),
    ];

    // Deduplicate by title prefix (first 40 chars, lowercased)
    const seen = new Set<string>();
    const deduplicated = allItems.filter(article => {
      const key = article.title.toLowerCase().substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[NewsService] Total unique articles from all sources: ${deduplicated.length}`);
    return deduplicated.slice(0, maxResults + 10); // give AI more data to work with
  }

  private async queryApi(query: string, maxResults: number): Promise<NewsArticle[]> {
    const response = await axios.get(NEWSDATA_BASE_URL, {
      params: {
        apikey: this.apiKey,
        q: query,
        language: 'en',
      },
      timeout: 10_000,
    });

    if (response.data && response.data.results) {
      return response.data.results.slice(0, maxResults).map((article: Record<string, unknown>) => ({
        title: article.title as string,
        description: article.description as string | undefined,
        link: article.link as string | undefined,
        pubDate: article.pubDate as string | undefined,
        source_id: article.source_id as string | undefined,
        category: Array.isArray(article.category) && article.category.length > 0
          ? (article.category[0] as string)
          : 'General',
        source_type: 'newsdata' as const,
      }));
    }

    return [];
  }
}

export const newsService = new NewsService();
