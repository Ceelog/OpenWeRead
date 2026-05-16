import { describe, expect, it } from 'vitest';
import { formatDate, formatDuration, formatRating, formatStar } from '../src/cli/format.js';

describe('format helpers', () => {
  it('formatDate: 时间戳转 YYYY-MM-DD', () => {
    expect(formatDate(0)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
    expect(formatDate(1748563200)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formatDuration: 秒转 X小时Y分钟', () => {
    expect(formatDuration(0)).toBe('0分钟');
    expect(formatDuration(60)).toBe('1分钟');
    expect(formatDuration(3600)).toBe('1小时');
    expect(formatDuration(3660)).toBe('1小时1分钟');
  });

  it('formatStar: 100 → 5 星', () => {
    expect(formatStar(0)).toBe('');
    expect(formatStar(100)).toBe('⭐⭐⭐⭐⭐');
    expect(formatStar(60)).toBe('⭐⭐⭐');
  });

  it('formatRating: 0-100 → X.X', () => {
    expect(formatRating(undefined)).toBe('-');
    expect(formatRating(85)).toBe('8.5');
  });
});
