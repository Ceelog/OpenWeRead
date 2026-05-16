import { describe, expect, it } from 'vitest';
import { ShelfApi, type ShelfSyncResponse } from '../src/api/shelf.js';

describe('ShelfApi.totalCount', () => {
  it('包含 books + albums + mp 入口', () => {
    const shelf: ShelfSyncResponse = {
      books: [
        { bookId: '1', title: 'a' },
        { bookId: '2', title: 'b' },
      ],
      albums: [{ albumInfo: { albumId: 'x', name: '专辑' } }],
      mp: { has: 1 },
    };
    expect(ShelfApi.totalCount(shelf)).toBe(4);
  });

  it('mp 为 null 时不计入', () => {
    const shelf: ShelfSyncResponse = {
      books: [{ bookId: '1', title: 'a' }],
      albums: [],
      mp: null,
    };
    expect(ShelfApi.totalCount(shelf)).toBe(1);
  });
});
