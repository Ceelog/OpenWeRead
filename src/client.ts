import { DEFAULT_TIMEOUT_MS, GATEWAY_URL, SKILL_VERSION } from './constants.js';
import { WereadAuthError, WereadError, WereadHttpError } from './errors.js';

export interface WereadClientOptions {
  apiKey?: string;
  baseUrl?: string;
  skillVersion?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface GatewayResponse {
  errcode?: number;
  errmsg?: string;
  upgrade_info?: { message?: string; [k: string]: unknown };
  [k: string]: unknown;
}

export class WereadClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly skillVersion: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: WereadClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.WEREAD_API_KEY ?? '';
    if (!apiKey) throw new WereadAuthError();
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? GATEWAY_URL;
    this.skillVersion = options.skillVersion ?? SKILL_VERSION;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error('No fetch implementation available. Node >= 18 required.');
    }
  }

  async call<T = GatewayResponse>(
    apiName: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const body = {
      api_name: apiName,
      skill_version: this.skillVersion,
      ...params,
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await this.fetchImpl(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new WereadHttpError(res.status, text);
    }

    const data = (await res.json()) as GatewayResponse;
    if (data && typeof data.errcode === 'number' && data.errcode !== 0) {
      throw new WereadError(data.errmsg ?? `errcode=${data.errcode}`, {
        errcode: data.errcode,
        upgradeInfo: data.upgrade_info,
        raw: data,
      });
    }
    return data as T;
  }

  /** 查询网关上所有可用接口及参数定义。 */
  listApis(): Promise<GatewayResponse> {
    return this.call('/_list');
  }
}
