import axios from 'axios';

const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/news';

export interface NewsArticle {
  title: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source_id?: string;
  category?: string;
}

export class NewsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEWSDATA_API_KEY || '';
  }

  /**
   * Fetch news articles for a given query.
   * FIX: Added broadFallback — if the specific query returns < 3 results,
   * retries with a broader single-keyword query. This prevents the AI from
   * receiving near-empty inputs and producing no trends or low-quality results.
   */
  async fetchNews(query: string, maxResults: number = 20): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      console.warn('[NewsService] ⚠️ NEWSDATA_API_KEY is not configured. Trend scanning requires this key.');
      return [];
    }

    try {
      const results = await this.queryApi(query, maxResults);

      // FIX: If the specific query returns fewer than 3 articles, try a broader search
      if (results.length < 3) {
        console.warn(`[NewsService] Specific query "${query}" returned only ${results.length} result(s). Trying broader query.`);
        const broadQuery = query.split(' ')[0]; // use first keyword only
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

  private async queryApi(query: string, maxResults: number): Promise<NewsArticle[]> {
    const response = await axios.get(NEWSDATA_BASE_URL, {
      params: {
        apikey: this.apiKey,
        q: query,
        language: 'en',
        // FIX: Request more articles so the AI has richer input to work with
        // NewsData.io free tier returns max 10 per call; paid tiers return up to 50
      },
      timeout: 10_000, // FIX: Added timeout to prevent hanging requests
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
      }));
    }

    return [];
  }
}

export const newsService = new NewsService();
