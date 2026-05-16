export class WereadError extends Error {
  readonly errcode: number;
  readonly upgradeInfo?: unknown;
  readonly raw?: unknown;

  constructor(message: string, opts: { errcode: number; upgradeInfo?: unknown; raw?: unknown }) {
    super(message);
    this.name = 'WereadError';
    this.errcode = opts.errcode;
    this.upgradeInfo = opts.upgradeInfo;
    this.raw = opts.raw;
  }
}

export class WereadAuthError extends WereadError {
  constructor(
    message = '未设置 WEREAD_API_KEY，请获取 https://weread.qq.com/r/weread-skills，并执行: export WEREAD_API_KEY=<你的apikey>',
  ) {
    super(message, { errcode: -1 });
    this.name = 'WereadAuthError';
  }
}

export class WereadHttpError extends WereadError {
  readonly status: number;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`, {
      errcode: status,
      raw: body,
    });
    this.name = 'WereadHttpError';
    this.status = status;
  }
}
