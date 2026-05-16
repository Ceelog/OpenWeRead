# OpenWeRead

微信读书开放 [Skills](./weread-skills) 的 TypeScript SDK 与命令行工具。

把 `https://i.weread.qq.com/api/agent/gateway` 这个统一网关包装成强类型 SDK，并基于 SDK 提供一个 `openweread` CLI。

## 安装

```bash
npm i -g openweread          # 安装 CLI
# 或在项目中使用 SDK
pnpm add openweread
```

## 鉴权

所有调用都依赖 `WEREAD_API_KEY`（格式 `wrk-xxxxxxxx`）：

获取并管理 WEREAD_API_KEY：https://weread.qq.com/r/weread-skills

## CLI 用法

```bash
export WEREAD_API_KEY=<你的 apikey>

openweread search 三体                       # 搜索电子书
openweread book info 3300045871              # 书籍详情
openweread book chapters 3300045871          # 章节目录
openweread book progress 3300045871          # 阅读进度
openweread shelf                             # 查看书架（含专辑/有声书）
openweread stats --mode monthly              # 本月阅读统计
openweread notes list                        # 笔记本概览
openweread notes bookmarks 3300045871        # 导出某本书的划线
openweread reviews 3300045871 --type 1       # 推荐点评
openweread recommend                         # 个性化推荐
openweread similar 3300045871                # 相似书推荐
openweread profile                           # 阅读概况
openweread --json shelf | jq                 # 任意命令加 --json 输出原始 JSON
```

## SDK 用法

```ts
import { OpenWeRead } from "openweread";

const weread = new OpenWeRead({ apiKey: "" }); // 读取 WEREAD_API_KEY

const result = await weread.search.search({ keyword: "三体", scope: 10 });
const shelf = await weread.shelf.sync();

for await (const book of weread.notes.notebooksAll()) {
  console.log(
    book.book.title,
    book.reviewCount + book.noteCount + book.bookmarkCount,
  );
}
```

底层 `WereadClient.call(apiName, params)` 可调用文档中未覆盖的接口；`api_name` 与 `skill_version` 由 SDK 自动注入，业务参数直接平铺即可。

## 开发

```bash
pnpm install
pnpm test          # vitest
pnpm lint          # biome
pnpm build         # 输出到 dist/
```

## 能力覆盖

| 模块      | 文档                                       | SDK 模块          | 主要接口                                               |
| --------- | ------------------------------------------ | ----------------- | ------------------------------------------------------ |
| 搜索      | [search.md](./weread-skills/search.md)     | `weread.search`   | `/store/search`                                        |
| 书籍      | [book.md](./weread-skills/book.md)         | `weread.book`     | `/book/info`、`/book/chapterinfo`、`/book/getprogress` |
| 书架      | [shelf.md](./weread-skills/shelf.md)       | `weread.shelf`    | `/shelf/sync`                                          |
| 阅读统计  | [readdata.md](./weread-skills/readdata.md) | `weread.readData` | `/readdata/detail`                                     |
| 笔记/划线 | [notes.md](./weread-skills/notes.md)       | `weread.notes`    | `/user/notebooks`、`/book/bookmarklist`                |
| 公开点评  | [review.md](./weread-skills/review.md)     | `weread.review`   | `/review/list`                                         |
| 推荐      | [discover.md](./weread-skills/discover.md) | `weread.discover` | `/book/recommend`、`/book/similar`                     |
| 用户概况  | [profile.md](./weread-skills/profile.md)   | `weread.profile`  | 组合接口                                               |

## License

MIT
