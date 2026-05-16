import { BookApi } from './api/book.js';
import { DiscoverApi } from './api/discover.js';
import { NotesApi } from './api/notes.js';
import { ProfileApi } from './api/profile.js';
import { ReadDataApi } from './api/readdata.js';
import { ReviewApi } from './api/review.js';
import { SearchApi } from './api/search.js';
import { ShelfApi } from './api/shelf.js';
import { WereadClient, type WereadClientOptions } from './client.js';

/**
 * OpenWeRead SDK：在底层 {@link WereadClient} 上聚合所有能力模块。
 *
 * ```ts
 * const weread = new OpenWeRead({ apiKey: process.env.WEREAD_API_KEY });
 * const result = await weread.search.search({ keyword: '三体', scope: 10 });
 * ```
 */
export class OpenWeRead {
  readonly client: WereadClient;
  readonly search: SearchApi;
  readonly book: BookApi;
  readonly shelf: ShelfApi;
  readonly readData: ReadDataApi;
  readonly notes: NotesApi;
  readonly review: ReviewApi;
  readonly discover: DiscoverApi;
  readonly profile: ProfileApi;

  constructor(options: WereadClientOptions = {}) {
    this.client = new WereadClient(options);
    this.search = new SearchApi(this.client);
    this.book = new BookApi(this.client);
    this.shelf = new ShelfApi(this.client);
    this.readData = new ReadDataApi(this.client);
    this.notes = new NotesApi(this.client);
    this.review = new ReviewApi(this.client);
    this.discover = new DiscoverApi(this.client);
    this.profile = new ProfileApi(this.shelf, this.book);
  }
}
