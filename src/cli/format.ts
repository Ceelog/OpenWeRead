/** 把 Unix 时间戳格式化为 YYYY-MM-DD。 */
export function formatDate(ts?: number): string {
  if (!ts) return '-';
  const d = new Date(ts * 1000);
  if (Number.isNaN(d.getTime())) return '-';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 秒 → "X小时Y分钟"。 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds < 0) return '0分钟';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

/** 微信读书 star 字段（20/40/.../100）→ "⭐"*n。 */
export function formatStar(star?: number): string {
  if (!star) return '';
  const n = Math.round(star / 20);
  return '⭐'.repeat(Math.max(0, Math.min(5, n)));
}

/** newRating 是 0-100 整数评分，展示成 X.X。 */
export function formatRating(rating?: number): string {
  if (rating === undefined || rating === null) return '-';
  return (rating / 10).toFixed(1);
}
