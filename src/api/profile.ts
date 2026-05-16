import type { BookApi, BookProgress } from './book.js';
import type { ShelfApi, ShelfSyncResponse } from './shelf.js';

export interface ProfileSummary {
  shelf: ShelfSyncResponse;
  shelfTotal: number;
  recent: Array<{ bookId: string; title: string; progress: BookProgress['book'] }>;
}

export class ProfileApi {
  constructor(
    private readonly shelf: ShelfApi,
    private readonly book: BookApi,
  ) {}

  /**
   * 组合 `/shelf/sync` + 多次 `/book/getprogress`，返回阅读概况。
   * 默认只拉取最近 5 本电子书的进度，避免请求过多。
   */
  async summary(opts: { recentCount?: number } = {}): Promise<ProfileSummary> {
    const recentCount = opts.recentCount ?? 5;
    const shelf = await this.shelf.sync();
    const shelfTotal =
      shelf.books.length +
      shelf.albums.length +
      (shelf.mp && Object.keys(shelf.mp).length > 0 ? 1 : 0);

    const sorted = [...shelf.books].sort(
      (a, b) => (b.readUpdateTime ?? 0) - (a.readUpdateTime ?? 0),
    );
    const recentBooks = sorted.slice(0, recentCount);
    const progresses = await Promise.all(
      recentBooks.map((b) =>
        this.book
          .progress(b.bookId)
          .then((p) => ({ bookId: b.bookId, title: b.title, progress: p.book }))
          .catch(() => null),
      ),
    );

    return {
      shelf,
      shelfTotal,
      recent: progresses.filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }
}
