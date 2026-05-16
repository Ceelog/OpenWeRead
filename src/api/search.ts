import type { WereadClient } from '../client.js';
import type { BookInfo } from '../types.js';

export type SearchScope = 0 | 2 | 4 | 6 | 10 | 12 | 13 | 14 | 16;

export interface SearchParams {
  keyword: string;
  scope?: SearchScope;
  maxIdx?: number;
  count?: number;
}

export interface SearchResultBook {
  searchIdx: number;
  bookInfo: BookInfo;
  readingCount?: number;
  newRating?: number;
  newRatingCount?: number;
  newRatingDetail?: { title?: string } & Record<string, unknown>;
}

export interface SearchResultGroup {
  title: string;
  scope: number;
  scopeCount: number;
  currentCount: number;
  books: SearchResultBook[];
}

export interface SearchResponse {
  sid: string;
  hasMore: number;
  results: SearchResultGroup[];
}

export class SearchApi {
  constructor(private readonly client: WereadClient) {}

  /** `/store/search` — 在书城搜索书籍、作者、文章等。 */
  search(params: SearchParams): Promise<SearchResponse> {
    return this.client.call<SearchResponse>('/store/search', { ...params });
  }
}
