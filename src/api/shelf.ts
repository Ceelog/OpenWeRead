import type { WereadClient } from '../client.js';

export interface ShelfBook {
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  category?: string;
  readUpdateTime?: number;
  finishReading?: number;
  updateTime?: number;
  isTop?: number;
  secret?: number;
}

export interface ShelfAlbum {
  albumInfo: {
    albumId: string;
    name: string;
    authorName?: string;
    cover?: string;
    trackCount?: number;
    finishStatus?: string;
    finish?: number;
    payType?: number;
    intro?: string;
    updateTime?: number;
  };
  albumInfoExtra?: {
    secret?: number;
    lecturePaid?: number;
    lectureReadUpdateTime?: number;
    isTop?: number;
  };
}

export interface ShelfArchive {
  name: string;
  bookIds: string[];
}

export interface ShelfSyncResponse {
  books: ShelfBook[];
  albums: ShelfAlbum[];
  mp?: Record<string, unknown> | null;
  archive?: ShelfArchive[];
  bookCount?: number;
}

export class ShelfApi {
  constructor(private readonly client: WereadClient) {}

  /** `/shelf/sync` — 同步当前用户书架。 */
  sync(): Promise<ShelfSyncResponse> {
    return this.client.call<ShelfSyncResponse>('/shelf/sync');
  }

  /**
   * 计算书架总条目数：`books.length + albums.length + (mp 非空 ? 1 : 0)`。
   * 见 weread-skills/shelf.md「数量口径」。
   */
  static totalCount(shelf: ShelfSyncResponse): number {
    const mpCount = shelf.mp && Object.keys(shelf.mp).length > 0 ? 1 : 0;
    return shelf.books.length + shelf.albums.length + mpCount;
  }
}
