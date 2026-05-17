#!/usr/bin/env node
import { Command } from 'commander';
import { formatDate, formatDuration, formatStar } from './cli/format.js';
import { WereadAuthError, WereadError } from './errors.js';
import { OpenWeRead } from './sdk.js';
import type { BookInfo } from './types.js';

const program = new Command();

program
  .name('openweread')
  .description('微信读书开放 Skills 命令行工具')
  .version('0.1.0')
  .option('--json', '以 JSON 原始输出，便于脚本管道处理')
  .option('--verbose', '打印 API 请求参数与响应结果，便于调试');

function isVerbose(): boolean {
  return Boolean(program.opts().verbose);
}

function createVerboseFetch(): typeof fetch {
  return async (input, init) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    let reqBody: unknown;
    if (init?.body && typeof init.body === 'string') {
      try {
        reqBody = JSON.parse(init.body);
      } catch {
        reqBody = init.body;
      }
    }
    process.stderr.write(`\n[verbose] → POST ${url}\n`);
    process.stderr.write(`[verbose] request: ${JSON.stringify(reqBody, null, 2)}\n`);
    const started = Date.now();
    const res = await globalThis.fetch(input, init);
    const elapsed = Date.now() - started;
    const cloned = res.clone();
    const text = await cloned.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep as text
    }
    process.stderr.write(`[verbose] ← ${res.status} ${res.statusText} (${elapsed}ms)\n`);
    process.stderr.write(`[verbose] response: ${JSON.stringify(parsed, null, 2)}\n\n`);
    return res;
  };
}

function sdk(): OpenWeRead {
  return new OpenWeRead(isVerbose() ? { fetch: createVerboseFetch() } : {});
}

function shouldOutputJson(): boolean {
  return Boolean(program.opts().json);
}

function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

// search ----------------------------------------------------------------------
program
  .command('search <keyword>')
  .description('在书城搜索')
  .option('-s, --scope <scope>', '搜索类型 (0=全部, 10=电子书, 14=听书, 6=作者 ...)', '10')
  .option('-c, --count <n>', '每页数量', (v) => Number.parseInt(v, 10))
  .action(async (keyword: string, opts) => {
    const res = await sdk().search.search({
      keyword,
      scope: Number.parseInt(opts.scope, 10) as 0 | 10,
      count: opts.count,
    });
    if (shouldOutputJson()) return printJson(res);

    const books: BookInfo[] = [];
    for (const group of res.results) {
      group.books.forEach((b, i) => {
        const info = b.bookInfo;
        info.bookId && books.push(info);
      });
    }

    if (books.length === 0) {
      console.log('没有找到相关书籍');
    }

    console.log('序号,书籍ID,书名,作者');
    books.forEach((b, i) => {
      console.log(`${i + 1},${b.bookId},${b.title},${b.author ?? '-'}`);
    });
  });

// book ------------------------------------------------------------------------
const book = program.command('book').description('书籍信息');

book
  .command('info <bookId>')
  .description('查看书籍基本信息')
  .action(async (bookId: string) => {
    const info = await sdk().book.info(bookId);
    if (shouldOutputJson()) return printJson(info);
    for (const [key, value] of Object.entries(info)) {
      console.log(`${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
  });

book
  .command('chapters <bookId>')
  .description('查看章节目录')
  .action(async (bookId: string) => {
    const res = await sdk().book.chapters(bookId);
    if (shouldOutputJson()) return printJson(res);
    for (const c of res.chapters) {
      const indent = '  '.repeat((c.level ?? 1) - 1);
      console.log(`${indent}${c.chapterIdx}. ${c.title}  (${c.wordCount ?? 0} 字)`);
    }
  });

book
  .command('progress <bookId>')
  .description('查看阅读进度')
  .action(async (bookId: string) => {
    const res = await sdk().book.progress(bookId);
    if (shouldOutputJson()) return printJson(res);
    const b = res.book;
    console.log(`进度: ${b.progress || 0}%`);
    console.log(`累计阅读: ${formatDuration(b.recordReadingTime)}`);
    console.log(`最后阅读: ${formatDate(b.updateTime)}`);
    if (b.finishTime) console.log(`读完时间: ${formatDate(b.finishTime)}`);
  });

// shelf -----------------------------------------------------------------------
program
  .command('shelf')
  .description('查看书架')
  .action(async () => {
    const res = await sdk().shelf.sync();
    if (shouldOutputJson()) return printJson(res);
    const mpCount = res.mp && Object.keys(res.mp).length > 0 ? 1 : 0;
    const total = res.books.length + res.albums.length + mpCount;
    console.log(
      `书架共 ${total} 个条目（电子书 ${res.books.length} + 专辑 ${res.albums.length} + 文章收藏 ${mpCount}）\n`,
    );
    console.log('序号，书籍 ID，标题，作者');
    res.books.forEach((b, i) => {
      console.log(`${i + 1},${b.bookId},${b.title},${b.author ?? '-'}`);
    });
  });

// readdata --------------------------------------------------------------------
program
  .command('stats')
  .description('阅读统计')
  .option('-m, --mode <mode>', 'weekly|monthly|annually|overall', 'monthly')
  .action(async (opts) => {
    const res = await sdk().readData.detail({ mode: opts.mode });
    if (shouldOutputJson()) return printJson(res);
    console.log(`周期: ${opts.mode}`);
    console.log(`总阅读: ${formatDuration(res.totalReadTime)}`);
    if (res.dayAverageReadTime) console.log(`日均: ${formatDuration(res.dayAverageReadTime)}`);
    if (res.readDays) console.log(`阅读天数: ${res.readDays}`);
    if (res.readStat) {
      console.log('\n概况:');
      for (const s of res.readStat) console.log(`  ${s.stat}: ${s.counts}`);
    }
  });

// notes -----------------------------------------------------------------------
const notes = program.command('notes').description('笔记/划线');

notes
  .command('list')
  .description('列出所有有笔记的书')
  .option('-c, --count <n>', '每页数量', (v) => Number.parseInt(v, 10), 20)
  .action(async (opts) => {
    const res = await sdk().notes.notebooks({ count: opts.count });
    if (shouldOutputJson()) return printJson(res);
    console.log(`共 ${res.totalBookCount} 本，笔记总数 ${res.totalNoteCount}\n`);
    console.log('序号，书籍 ID，标题，划线数，想法数，书签数');
    res.books.forEach((b, i) => {
      console.log(
        `${i + 1},${b.book.bookId},${b.book.title},${b.noteCount},${b.reviewCount},${b.bookmarkCount}`,
      );
    });
  });

notes
  .command('bookmarks <bookId>')
  .description('导出某本书的划线')
  .action(async (bookId: string) => {
    const res = await sdk().notes.bookmarks({ bookId });
    if (shouldOutputJson()) return printJson(res);
    for (const m of res.updated ?? []) {
      console.log(`- ${m.markText}`);
    }
  });

notes
  .command('mine <bookId>')
  .description('导出某本书的个人想法/点评')
  .option('-c, --count <n>', '每页数量', (v) => Number.parseInt(v, 10), 20)
  .option('-s, --synckey <n>', '翻页游标', (v) => Number.parseInt(v, 10), 0)
  .action(async (bookId: string, opts) => {
    const res = await sdk().notes.mineReviews({
      bookid: bookId,
      count: opts.count,
      synckey: opts.synckey,
    });
    if (shouldOutputJson()) return printJson(res);
    console.log(`共 ${res.totalCount || 0} 条，hasMore=${res.hasMore}\n`);
    for (const item of res.reviews ?? []) {
      const r = item.review;
      const head = r.chapterName
        ? `[${r.chapterName}] `
        : r.isFinish !== undefined
          ? '[书评] '
          : '';
      const star = r.star ? ` ${formatStar(r.star)}` : '';
      console.log(`${head}${formatDate(r.createTime)}${star}`);
      if (r.abstract) console.log(`  > ${r.abstract}`);
      console.log(`  ${r.content}\n`);
    }
  });

notes
  .command('underlines <bookId> <chapterUid>')
  .description('查看章节划线热度统计（无文本）')
  .action(async (bookId: string, chapterUid: string) => {
    const res = await sdk().notes.underlines({
      bookId,
      chapterUid: Number.parseInt(chapterUid, 10),
    });
    if (shouldOutputJson()) return printJson(res);
    for (const u of res.underlines ?? []) {
      console.log(`  range=${u.range}  人数=${u.count}  得分=${u.score ?? '-'}`);
    }
  });

notes
  .command('best <bookId>')
  .description('查看全书热门划线（含原文与人数）')
  .option('-u, --chapter <uid>', '章节 UID（0=全部）', (v) => Number.parseInt(v, 10), 0)
  .action(async (bookId: string, opts) => {
    const res = await sdk().notes.bestBookmarks({
      bookId,
      chapterUid: opts.chapter,
    });
    if (shouldOutputJson()) return printJson(res);
    const titleByUid = new Map((res.chapters ?? []).map((c) => [c.chapterUid, c.title ?? '']));
    console.log(`共 ${res.totalCount || 0} 条热门划线\n`);
    res.items?.forEach((it, i) => {
      const ch = titleByUid.get(it.chapterUid);
      console.log(`  ${i + 1}. [${it.totalCount} 人] ${ch ? `《${ch}》 ` : ''}range=${it.range}`);
      console.log(`     > ${it.markText}`);
    });
  });

notes
  .command('readreviews <bookId> <chapterUid> <range>')
  .description('查看某条热门划线下的想法（range 来自 best 命令）')
  .option('-c, --count <n>', '每页数量（≤20）', (v) => Number.parseInt(v, 10), 20)
  .option('-s, --synckey <n>', '翻页游标', (v) => Number.parseInt(v, 10), 0)
  .action(async (bookId: string, chapterUid: string, range: string, opts) => {
    const res = await sdk().notes.readReviews({
      bookId,
      chapterUid: Number.parseInt(chapterUid, 10),
      reviews: [{ range, count: opts.count, synckey: opts.synckey }],
    });
    if (shouldOutputJson()) return printJson(res);
    for (const group of res.reviews ?? []) {
      console.log(`range=${group.range}  共 ${group.totalCount} 条想法\n`);
      for (const pr of group.pageReviews ?? []) {
        const r = pr.review;
        console.log(`- ${r.author?.name ?? '匿名'}  ${formatDate(r.createTime)}`);
        if (r.abstract) console.log(`  > ${r.abstract}`);
        console.log(`  ${r.content}\n`);
      }
    }
  });

notes
  .command('review <reviewId>')
  .description('查看单条想法详情')
  .option('--comments <n>', '拉取评论数量', (v) => Number.parseInt(v, 10), 10)
  .option('--likes <n>', '拉取点赞数量', (v) => Number.parseInt(v, 10), 10)
  .action(async (reviewId: string, opts) => {
    const res = await sdk().notes.reviewSingle({
      reviewId,
      commentsCount: opts.comments,
      likesCount: opts.likes,
    });
    if (shouldOutputJson()) return printJson(res);
    const r = res.review;
    console.log(`作者: ${r.author?.name ?? '匿名'}`);
    console.log(`时间: ${formatDate(r.createTime)}`);
    console.log(`\n${r.content}`);
  });

// review ----------------------------------------------------------------------
program
  .command('reviews <bookId>')
  .description('查看书籍公开点评')
  .option('-t, --type <n>', '0=全部 1=推荐 2=不行 3=最新 4=一般', (v) => Number.parseInt(v, 10), 0)
  .option('-c, --count <n>', '每页数量', (v) => Number.parseInt(v, 10))
  .action(async (bookId: string, opts) => {
    const res = await sdk().review.list({
      bookId,
      reviewListType: opts.type,
      count: opts.count,
    });
    if (shouldOutputJson()) return printJson(res);
    console.log(`共 ${res.reviewsCnt} 条点评\n`);
    for (const r of res.reviews) {
      const rv = r.review.review;
      console.log(`[${formatStar(rv.star)}] ${rv.author.name}  ${formatDate(rv.createTime)}`);
      console.log(`  ${rv.content.slice(0, 200)}${rv.content.length > 200 ? '…' : ''}\n`);
    }
  });

// discover --------------------------------------------------------------------
program
  .command('recommend')
  .description('个性化推荐')
  .option('-c, --count <n>', '每页数量', (v) => Number.parseInt(v, 10))
  .action(async (opts) => {
    const res = await sdk().discover.recommend({ count: opts.count });
    if (shouldOutputJson()) return printJson(res);
    res.books.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.title} - ${b.author ?? '-'}  ${b.reason ?? ''}`);
    });
  });

program
  .command('similar <bookId>')
  .description('相似书推荐')
  .action(async (bookId: string) => {
    const res = await sdk().discover.similar({ bookId });
    if (shouldOutputJson()) return printJson(res);
    res.booksimilar.books.forEach((item, i) => {
      const info = item.book.bookInfo;
      console.log(`  ${i + 1}. ${info.title} - ${info.author ?? '-'}  bookId=${info.bookId}`);
    });
  });

// profile ---------------------------------------------------------------------
program
  .command('profile')
  .description('阅读概况：书架 + 最近阅读进度')
  .option('-n, --recent <n>', '最近若干本', (v) => Number.parseInt(v, 10), 5)
  .action(async (opts) => {
    const res = await sdk().profile.summary({ recentCount: opts.recent });
    if (shouldOutputJson()) return printJson(res);
    console.log(`书架共 ${res.shelfTotal} 个条目\n`);
    console.log('最近阅读：');
    for (const r of res.recent) {
      console.log(
        `  ${r.bookId} - ${r.title} — 进度 ${r.progress.progress}% — 最近 ${formatDate(r.progress.updateTime)}`,
      );
    }
  });

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err) {
    if (err instanceof WereadAuthError) {
      process.stderr.write(`${err.message}\n`);
      process.exit(2);
    }
    if (err instanceof WereadError) {
      process.stderr.write(`微信读书接口错误 (errcode=${err.errcode}): ${err.message}\n`);
      if (err.upgradeInfo && typeof err.upgradeInfo === 'object' && 'message' in err.upgradeInfo) {
        process.stderr.write(`升级提示: ${(err.upgradeInfo as { message?: string }).message}\n`);
      }
      process.exit(1);
    }
    process.stderr.write(`${(err as Error).message}\n`);
    process.exit(1);
  }
}

main();
