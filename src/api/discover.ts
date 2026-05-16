import type { WereadClient } from '../client.js';
import type { BookInfo } from '../types.js';

export interface RecommendParams {
  count?: number;
  maxIdx?: number;
}

export interface RecommendBook extends BookInfo {
  reason?: string;
  readingCount?: number;
  searchIdx?: number;
  type?: number;
}

export interface RecommendResponse {
  books: RecommendBook[];
}

export interface SimilarParams {
  bookId: string;
  count?: number;
  maxIdx?: number;
  sessionId?: string;
}

export interface SimilarResponse {
  booksimilar: {
    sessionId: string;
    books: Array<{ idx: number; book: { bookInfo: BookInfo } }>;
  };
}

export class DiscoverApi {
  constructor(private readonly client: WereadClient) {}

  /** `/book/recommend` — 个性化推荐。 */
  recommend(params: RecommendParams = {}): Promise<RecommendResponse> {
    return this.client.call<RecommendResponse>('/book/recommend', { ...params });
  }

  /** `/book/similar` — 相似书推荐。 */
  similar(params: SimilarParams): Promise<SimilarResponse> {
    return this.client.call<SimilarResponse>('/book/similar', { ...params });
  }
}
