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
    fetchNews(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.apiKey) {
                console.warn('⚠️ NewsData API key is missing.');
                return [];
            }
            try {
                // NewsData.io requires 'q' for query. Can also filter by language/country if needed.
                // We'll search for the latest news in English.
                const response = yield axios_1.default.get(NEWSDATA_BASE_URL, {
                    params: {
                        apikey: this.apiKey,
                        q: query,
                        language: 'en',
                        // prioritydomain: 'top', // Optional: for higher quality sources
                    }
                });
                if (response.data && response.data.results) {
                    return response.data.results.map((article) => ({
                        title: article.title,
                        description: article.description,
                        link: article.link,
                        pubDate: article.pubDate,
                        source_id: article.source_id,
                        category: article.category ? article.category[0] : 'General'
                    }));
                }
                return [];
            }
            catch (error) {
                console.error('Error fetching news:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return [];
            }
        });
    }
}
exports.NewsService = NewsService;
exports.newsService = new NewsService();
