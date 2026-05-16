export interface BookInfo {
  bookId: string;
  title: string;
  author?: string;
  translator?: string;
  cover?: string;
  intro?: string;
  category?: string;
  publisher?: string;
  publishTime?: string;
  isbn?: string;
  wordCount?: number;
  newRating?: number;
  newRatingCount?: number;
  newRatingDetail?: { title?: string } & Record<string, unknown>;
  payType?: number;
  price?: number;
  soldout?: number;
  [k: string]: unknown;
}

export interface Pagination {
  count?: number;
  maxIdx?: number;
}
