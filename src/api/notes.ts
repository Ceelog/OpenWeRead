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
