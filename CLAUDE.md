# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`openweread` 是微信读书开放 Skills（`./weread-skills/`）的 TypeScript SDK + CLI。所有功能最终都是把请求打到统一网关 `POST https://i.weread.qq.com/api/agent/gateway`，通过 body 中的 `api_name` 区分接口。SDK 发布为同名 npm 包，CLI 通过 `npm i -g openweread` 安装。

## Commands

包管理用 pnpm（`packageManager` 在 package.json 固定），Node ≥ 18（CLI 使用全局 `fetch`、`AbortController`）。

```bash
pnpm install
pnpm test                       # vitest run，跑 tests/ 与 src/ 下所有 *.test.ts
pnpm test:watch                 # 监听模式
pnpm vitest run tests/client.test.ts                # 单文件
pnpm vitest run -t "throws WereadError"             # 按用例名筛选
pnpm typecheck                  # tsc --noEmit（含 tests）
pnpm lint                       # biome check .
pnpm format                     # biome format --write .（不会动 weread-skills/）
pnpm build                      # tsc -p tsconfig.build.json + chmod +x dist/cli.js
node dist/cli.js --help         # 本地试跑 CLI
WEREAD_API_KEY=wrk-xxx node dist/cli.js shelf       # 真实跑接口
```

`prepublishOnly` 会串行执行 lint → test → build；改这三个任意一个，等于改发布门禁。

## Architecture

整个 SDK 是「一个 HTTP 客户端 + 一组按 weread-skills 文档切分的薄包装」。

**网关与协议（[src/client.ts](src/client.ts)、[src/constants.ts](src/constants.ts)）**
`WereadClient.call(apiName, params)` 负责所有 HTTP 细节：
- 自动注入 `api_name` 与 `skill_version`，业务参数**必须平铺在 body 顶层**——这是 weread-skills 文档反复强调的规范，不要再封装一层 `params/data/body`。
- `Authorization: Bearer ${WEREAD_API_KEY}`；构造期 key 缺失即抛 `WereadAuthError`。
- 响应 `errcode !== 0` 抛 `WereadError`，且会把 `upgrade_info` 透传到 `err.upgradeInfo`；调用方必须能据此提示升级（CLI 已实现）。
- 接受 `options.fetch` 注入，所有单测都用这个口子 mock，不需要 nock/msw。

**能力模块（[src/api/](src/api/)）**
每个文件对应 `weread-skills/*.md` 的一个能力（search/book/shelf/readdata/notes/review/discover/profile）。每个 API 类只是把 `client.call('/xxx', params)` 包成强类型方法，类型字段直接抄文档表格——文档与类型同步，是修改这层时最重要的不变量。

文档里给出的"业务计算口径"必须落到代码里，而不是留给调用方算：
- 书架总数：`books.length + albums.length + (mp 非空 ? 1 : 0)` → [`ShelfApi.totalCount`](src/api/shelf.ts)，CLI 的 `shelf` 命令也复用该公式。
- 单本笔记总数：`reviewCount + noteCount + bookmarkCount` → [`totalNoteCount`](src/api/notes.ts)。注意 `noteCount` 是"划线条数"而非"笔记总数"，别按字面翻译。
- `/user/notebooks` 用 `lastSort` 游标分页（**不是 offset/limit**），用 [`NotesApi.notebooksAll`](src/api/notes.ts) 这个 async generator 自动翻页。
- `profile` 模块没有对应的真实接口，是 `/shelf/sync` + 多个 `/book/getprogress` 的组合（见 [`ProfileApi.summary`](src/api/profile.ts)），保持这一约定。

**SDK 聚合（[src/sdk.ts](src/sdk.ts)）**
`OpenWeRead` 只是把一个 `WereadClient` 实例分发给各 API 类。新增能力模块时：在 `src/api/` 新增文件 → 在 `OpenWeRead` 构造里挂上 → 在 [src/index.ts](src/index.ts) 重导出 → CLI 加子命令。

**CLI（[src/cli.ts](src/cli.ts) + [src/cli/format.ts](src/cli/format.ts)）**
- commander 风格，每个子命令一个 `.action`，内部 `new OpenWeRead()` 调用对应 SDK 方法。
- 顶层 `--json` 走 `printJson`，否则走人类可读输出；新增子命令请同时支持这两种模式。
- 错误处理在 `main()` 末尾集中：`WereadAuthError` → exit 2，`WereadError` → 打印 errcode + upgrade 提示 → exit 1。
- 展示数据时遵循 weread-skills/SKILL.md 第 10 条：Unix 时间戳走 `formatDate`（YYYY-MM-DD），阅读时长走 `formatDuration`（X小时Y分钟），评分走 `formatStar`/`formatRating`。

## Conventions

- ESM only：`package.json` `"type": "module"`，**所有相对 import 必须带 `.js` 扩展名**（即使源文件是 `.ts`），否则 tsc 的 `Bundler` resolver 在运行时找不到模块。
- `verbatimModuleSyntax: true`：仅作类型用的 import 必须写 `import type { Foo }`，否则 biome 也会报。
- biome 配置：单引号、100 列、`noExplicitAny: warn`、`useNodejsImportProtocol: error`（写 Node 内置模块时用 `node:` 前缀）。
- 构建只编译 `src/`（`tsconfig.build.json` 排除 tests 与 `*.test.ts`）；测试与源码可共存，vitest 同时收集 `tests/**` 与 `src/**/*.test.ts`。
- `weread-skills/` 是上游文档目录，**只读参考，不要修改**；biome / .gitignore 都已排除它。文档里给出的字段释义优先级高于字段名直觉——遇到字段名和直觉冲突，按文档为准。

## Reference

接口未覆盖时，可用 `client.call('/_list')` 让服务端返回所有可用接口与参数定义，比猜更可靠。新增 API 类前先读对应的 `weread-skills/<module>.md`。
