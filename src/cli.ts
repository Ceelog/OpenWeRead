#!/usr/bin/env node
import { Command } from 'commander';
import { formatDate, formatDuration, formatRating, formatStar } from './cli/format.js';
import { WereadAuthError, WereadError } from './errors.js';
import { OpenWeRead } from './sdk.js';

const program = new Command();

program
  .name('openweread')
  .description('微信读书开放 Skills 命令行工具')
  .version('0.1.0')
  .option('--json', '以 JSON 原始输出，便于脚本管道处理');

function sdk(): OpenWeRead {
  return new OpenWeRead();
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

    for (const group of res.results) {
      console.log(`\n[${group.title}] 共 ${group.scopeCount} 条`);
      group.books.forEach((b, i) => {
        const info = b.bookInfo;
        console.log(
          `  ${i + 1}. ${info.title} - ${info.author ?? '-'}  评分 ${formatRating(b.newRating)}  bookId=${info.bookId}`,
        );
      });
    }
  });

// book ------------------------------------------------------------------------
const book = program.command('book').description('书籍信息');

book
  .command('info <bookId>')
  .description('查看书籍基本信息')
  .action(async (bookId: string) => {
    const info = await sdk().book.info(bookId);
    if (shouldOutputJson()) return printJson(info);
    console.log(`${info.title} / ${info.author ?? '-'}`);
    console.log(`分类: ${info.category ?? '-'}  出版: ${info.publisher ?? '-'}`);
    console.log(`评分: ${formatRating(info.newRating)} (${info.newRatingCount ?? 0} 人)`);
    if (info.intro) console.log(`简介: ${info.intro}`);
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
    console.log(`进度: ${b.progress}%`);
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
    res.books.forEach((b, i) => {
      const tag = b.finishReading ? '[读完]' : '';
      console.log(`  ${i + 1}. ${b.title} - ${b.author ?? '-'} ${tag}  bookId=${b.bookId}`);
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
    res.books.forEach((b, i) => {
      const total = b.reviewCount + b.noteCount + b.bookmarkCount;
      console.log(
        `  ${i + 1}. ${b.book.title}  笔记 ${total} (划线 ${b.noteCount} / 想法 ${b.reviewCount} / 书签 ${b.bookmarkCount})`,
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
        `  ${r.title} — 进度 ${r.progress.progress}% — 最近 ${formatDate(r.progress.updateTime)}`,
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
