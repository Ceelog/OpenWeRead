import type { WereadClient } from '../client.js';

export type ReviewListType = 0 | 1 | 2 | 3 | 4;

export interface ReviewListParams {
  bookId: string;
  reviewListType?: ReviewListType;
  count?: number;
  maxIdx?: number;
  synckey?: number;
}

export interface ReviewItem {
  idx: number;
  review: {
    reviewId: string;
    review: {
      content: string;
      htmlContent?: string;
      /** 20/40/60/80/100。 */
      star?: number;
      isFinish?: number;
      createTime?: number;
      chapterName?: string;
      author: { userVid: string; name: string; avatar?: string };
      book: { bookId: string; title?: string; author?: string };
    };
  };
}

export interface ReviewListResponse {
  synckey: number;
  reviewsCnt: number;
  recentTotalCnt?: number;
  reviewsHasMore?: number;
  friendCommentCount?: number;
  reviews: ReviewItem[];
}

export class ReviewApi {
  constructor(private readonly client: WereadClient) {}

  /** `/review/list` — 书籍公开点评。 */
  list(params: ReviewListParams): Promise<ReviewListResponse> {
    return this.client.call<ReviewListResponse>('/review/list', { ...params });
  }
}
