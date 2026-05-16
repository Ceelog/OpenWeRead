import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WereadClient } from '../src/client.js';
import { WereadAuthError, WereadError, WereadHttpError } from '../src/errors.js';

function mockFetchOk(body: unknown): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  ) as unknown as typeof fetch;
}

describe('WereadClient', () => {
  beforeEach(() => {
    // biome-ignore lint/performance/noDelete: test needs to actually remove the env var, not stringify "undefined"
    delete process.env.WEREAD_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws WereadAuthError when api key is missing', () => {
    expect(() => new WereadClient()).toThrow(WereadAuthError);
  });

  it('reads api key from env', () => {
    process.env.WEREAD_API_KEY = 'wrk-test';
    expect(() => new WereadClient({ fetch: mockFetchOk({ errcode: 0 }) })).not.toThrow();
  });

  it('posts JSON with bearer auth, api_name and skill_version', async () => {
    const fetchMock = mockFetchOk({ errcode: 0, hello: 'world' });
    const client = new WereadClient({ apiKey: 'wrk-x', fetch: fetchMock });

    const data = await client.call('/store/search', { keyword: '三体', scope: 10 });
    expect(data).toEqual({ errcode: 0, hello: 'world' });

    const call = (fetchMock as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    expect(call?.[0]).toMatch(/i\.weread\.qq\.com\/api\/agent\/gateway$/);
    const init = call?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer wrk-x');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      api_name: '/store/search',
      keyword: '三体',
      scope: 10,
    });
    expect(body.skill_version).toBeTruthy();
  });

  it('throws WereadError when errcode != 0', async () => {
    const fetchMock = mockFetchOk({ errcode: 1001, errmsg: '签名错误' });
    const client = new WereadClient({ apiKey: 'wrk-x', fetch: fetchMock });
    await expect(client.call('/store/search')).rejects.toMatchObject({
      name: 'WereadError',
      errcode: 1001,
      message: '签名错误',
    });
  });

  it('throws WereadHttpError on non-2xx', async () => {
    const fetchMock = vi.fn(
      async () => new Response('bad', { status: 500 }),
    ) as unknown as typeof fetch;
    const client = new WereadClient({ apiKey: 'wrk-x', fetch: fetchMock });
    await expect(client.call('/x')).rejects.toBeInstanceOf(WereadHttpError);
  });

  it('exposes upgrade_info on the thrown error', async () => {
    const fetchMock = mockFetchOk({
      errcode: 9,
      errmsg: '需升级',
      upgrade_info: { message: 'pls upgrade' },
    });
    const client = new WereadClient({ apiKey: 'wrk-x', fetch: fetchMock });
    await expect(client.call('/x')).rejects.toMatchObject({
      errcode: 9,
      upgradeInfo: { message: 'pls upgrade' },
    });
  });
});
