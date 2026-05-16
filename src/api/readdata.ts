import type { WereadClient } from '../client.js';

export type ReadDataMode = 'weekly' | 'monthly' | 'annually' | 'overall';

export interface ReadDataParams {
  mode?: ReadDataMode;
  baseTime?: number;
}

export interface ReadStatItem {
  stat: string;
  counts: string;
  scheme?: string;
}

export interface ReadDataResponse {
  baseTime: number;
  /** 秒。 */
  totalReadTime: number;
  /** 秒。 */
  dayAverageReadTime?: number;
  readDays?: number;
  readTimes?: Record<string, number>;
  dailyReadTimes?: Record<string, number>;
  compare?: number;
  readStat?: ReadStatItem[];
  readLongest?: Array<Record<string, unknown>>;
  preferCategory?: Array<Record<string, unknown>>;
  preferTime?: number[];
  preferTimeWord?: string;
  preferAuthor?: Array<Record<string, unknown>>;
  authorCount?: number;
  preferPublisher?: Array<Record<string, unknown>>;
  rank?: { text?: string; scheme?: string };
  [k: string]: unknown;
}

export class ReadDataApi {
  constructor(private readonly client: WereadClient) {}

  /** `/readdata/detail` — 阅读统计详情。 */
  detail(params: ReadDataParams = {}): Promise<ReadDataResponse> {
    return this.client.call<ReadDataResponse>('/readdata/detail', { ...params });
  }
}
