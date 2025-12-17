import axios from 'axios';

const NEWSDATA_BASE_URL = 'https://newsdata.io/api/1/news';

export class NewsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEWSDATA_API_KEY || '';
  }

  async fetchNews(query: string) {
    if (!this.apiKey) {
      console.warn('⚠️ NewsData API key is missing.');
      return [];
    }

    try {
      // NewsData.io requires 'q' for query. Can also filter by language/country if needed.
      // We'll search for the latest news in English.
      const response = await axios.get(NEWSDATA_BASE_URL, {
        params: {
          apikey: this.apiKey,
          q: query,
          language: 'en',
          // prioritydomain: 'top', // Optional: for higher quality sources
        }
      });

      if (response.data && response.data.results) {
        return response.data.results.map((article: any) => ({
          title: article.title,
          description: article.description,
          link: article.link,
          pubDate: article.pubDate,
          source_id: article.source_id,
          category: article.category ? article.category[0] : 'General'
        }));
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching news:', error.response?.data || error.message);
      return [];
    }
  }
}

export const newsService = new NewsService();
