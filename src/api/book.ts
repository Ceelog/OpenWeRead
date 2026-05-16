import type { WereadClient } from '../client.js';
import type { BookInfo } from '../types.js';

export interface ChapterInfo {
  chapterUid: number;
  chapterIdx: number;
  title: string;
  wordCount?: number;
  level?: number;
  updateTime?: number;
  price?: number;
  paid?: number;
  isMPChapter?: number;
  anchors?: Array<{ title: string; level?: number }>;
}

export interface ChapterInfoResponse {
  bookId: string;
  synckey: number;
  chapterUpdateTime?: number;
  chapters: ChapterInfo[];
}

export interface BookProgress {
  bookId: string;
  book: {
    chapterUid?: number;
    chapterOffset?: number;
    /** 0-100，1 表示 1%。 */
    progress: number;
    updateTime?: number;
    recordReadingTime?: number;
    finishTime?: number;
    isStartReading?: number;
  };
}

export class BookApi {
  constructor(private readonly client: WereadClient) {}

  /** `/book/info` — 书籍基本信息。 */
  info(bookId: string): Promise<BookInfo> {
    return this.client.call<BookInfo>('/book/info', { bookId });
  }

  /** `/book/chapterinfo` — 章节目录。 */
  chapters(bookId: string): Promise<ChapterInfoResponse> {
    return this.client.call<ChapterInfoResponse>('/book/chapterinfo', { bookId });
  }

  /** `/book/getprogress` — 阅读进度。 */
  progress(bookId: string): Promise<BookProgress> {
    return this.client.call<BookProgress>('/book/getprogress', { bookId });
  }
}
