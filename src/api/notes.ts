import type { WereadClient } from '../client.js';

export interface NotebookBook {
  bookId: string;
  book: {
    bookId: string;
    title: string;
    author?: string;
    cover?: string;
  };
  /** 想法/点评数（含划线想法、个人点评等）。 */
  reviewCount: number;
  /** 划线数（高亮原文条数）。 */
  noteCount: number;
  /** 书签数（只计数，不导出内容）。 */
  bookmarkCount: number;
  readingProgress?: number;
  markedStatus?: number;
  sort: number;
}

export interface NotebooksResponse {
  totalBookCount: number;
  totalNoteCount: number;
  hasMore: number;
  books: NotebookBook[];
}

export interface Bookmark {
  bookmarkId: string;
  bookId: string;
  chapterUid?: number;
  /** 形如 "900-2004"。 */
  range: string;
  markText: string;
  createTime?: number;
  style?: number;
  type?: number;
}

export interface BookmarkListResponse {
  book?: { bookId: string; title?: string };
  chapters?: Array<{ chapterUid: number; title?: string }>;
  updated: Bookmark[];
}

export interface NotebooksParams {
  count?: number;
  lastSort?: number;
}

export interface BookmarkListParams {
  bookId: string;
  synckey?: number;
}

export interface MineReviewItem {
  reviewId: string;
  content: string;
  createTime?: number;
  star?: number;
  chapterName?: string;
  isFinish?: number;
  range?: string;
  chapterUid?: number;
  abstract?: string;
}

export interface MineReviewListResponse {
  totalCount: number;
  hasMore: number;
  synckey: number;
  reviews: Array<{ review: MineReviewItem }>;
}

export interface MineReviewListParams {
  bookid: string;
  synckey?: number;
  count?: number;
}

export interface UnderlinesParams {
  bookId: string;
  chapterUid: number;
  synckey?: number;
}

export interface UnderlineItem {
  range: string;
  count: number;
  score?: number;
  type?: number;
}

export interface UnderlinesResponse {
  bookId: string;
  chapterUid: number;
  synckey: number;
  underlines: UnderlineItem[];
}

export interface BestBookmarksParams {
  bookId: string;
  chapterUid?: number;
  synckey?: number;
}

export interface BestBookmarkItem {
  bookId: string;
  userVid?: string;
  bookmarkId: string;
  chapterUid: number;
  range: string;
  markText: string;
  totalCount: number;
  simplifiedRange?: string;
  traditionalRange?: string;
}

export interface BestBookmarksResponse {
  synckey: number;
  totalCount: number;
  items: BestBookmarkItem[];
  chapters?: Array<{ bookId: string; chapterUid: number; chapterIdx?: number; title?: string }>;
}

export interface ReadReviewsRangeParams {
  range: string;
  maxIdx?: number;
  count?: number;
  synckey?: number;
}

export interface ReadReviewsParams {
  bookId: string;
  chapterUid: number;
  reviews: ReadReviewsRangeParams[];
}

export interface ReadReviewPageReview {
  reviewId: string;
  review: {
    reviewId: string;
    abstract?: string;
    content: string;
    range?: string;
    createTime?: number;
    author?: { userVid: string; name: string; avatar?: string };
  };
}

export interface ReadReviewsRangeResult {
  range: string;
  totalCount: number;
  hasMore: number;
  maxIdx: number;
  synckey: number;
  pageReviews: ReadReviewPageReview[];
}

export interface ReadReviewsResponse {
  bookId: string;
  chapterUid: number;
  reviews: ReadReviewsRangeResult[];
}

export interface ReviewSingleParams {
  reviewId: string;
  commentsCount?: number;
  commentsDirection?: 0 | 1;
  likesCount?: number;
  likesDirection?: 0 | 1;
  synckey?: number;
}

export interface ReviewSingleResponse {
  reviewId: string;
  synckey: number;
  htmlContent?: string;
  review: {
    reviewId: string;
    content: string;
    bookId?: string;
    chapterUid?: number;
    createTime?: number;
    author?: { userVid: string; name: string; avatar?: string };
  };
}

export class NotesApi {
  constructor(private readonly client: WereadClient) {}

  /** `/user/notebooks` — 所有有笔记的书。 */
  notebooks(params: NotebooksParams = {}): Promise<NotebooksResponse> {
    return this.client.call<NotebooksResponse>('/user/notebooks', { ...params });
  }

  /** `/book/bookmarklist` — 单本书的划线内容（已过滤书签）。 */
  bookmarks(params: BookmarkListParams): Promise<BookmarkListResponse> {
    return this.client.call<BookmarkListResponse>('/book/bookmarklist', { ...params });
  }

  /** `/review/list/mine` — 单本书的个人想法与点评。 */
  mineReviews(params: MineReviewListParams): Promise<MineReviewListResponse> {
    return this.client.call<MineReviewListResponse>('/review/list/mine', { ...params });
  }

  /** `/book/underlines` — 章节划线热度统计（不含文本）。 */
  underlines(params: UnderlinesParams): Promise<UnderlinesResponse> {
    return this.client.call<UnderlinesResponse>('/book/underlines', { ...params });
  }

  /** `/book/bestbookmarks` — 全书热门划线（含原文与人数，固定前 20 条）。 */
  bestBookmarks(params: BestBookmarksParams): Promise<BestBookmarksResponse> {
    return this.client.call<BestBookmarksResponse>('/book/bestbookmarks', { ...params });
  }

  /** `/book/readreviews` — 划线下的想法/评论。 */
  readReviews(params: ReadReviewsParams): Promise<ReadReviewsResponse> {
    return this.client.call<ReadReviewsResponse>('/book/readreviews', { ...params });
  }

  /** `/review/single` — 单条想法详情。 */
  reviewSingle(params: ReviewSingleParams): Promise<ReviewSingleResponse> {
    return this.client.call<ReviewSingleResponse>('/review/single', { ...params });
  }

  /**
   * 异步遍历分页拉取笔记本概览，自动按 `lastSort` 翻页。
   * 用法：`for await (const book of notes.notebooksAll()) { ... }`
   */
  async *notebooksAll(pageSize = 100): AsyncGenerator<NotebookBook> {
    let lastSort: number | undefined;
    while (true) {
      const params: NotebooksParams = { count: pageSize };
      if (lastSort !== undefined) params.lastSort = lastSort;
      const page = await this.notebooks(params);
      for (const book of page.books) yield book;
      if (!page.hasMore || page.books.length === 0) return;
      lastSort = page.books[page.books.length - 1]?.sort;
      if (lastSort === undefined) return;
    }
  }
}

/** 笔记总数 = 划线 + 想法/点评 + 书签。 */
export function totalNoteCount(
  book: Pick<NotebookBook, 'reviewCount' | 'noteCount' | 'bookmarkCount'>,
): number {
  return book.reviewCount + book.noteCount + book.bookmarkCount;
}
