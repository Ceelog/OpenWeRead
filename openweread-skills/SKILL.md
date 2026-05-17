---
name: openweread
description: Use the openweread CLI to search WeRead books, inspect book details and chapters, read shelf/profile/stats, export notes and highlights, view reviews, and get recommendations. Trigger when the user asks about 微信读书, WeRead, books on their shelf, reading progress, reading stats, notes, highlights, reviews, or recommendations.
version: 0.1.0
---

# OpenWeRead CLI

Use the `openweread` command line tool for 微信读书 tasks. Prefer CLI commands over direct HTTP calls because the CLI handles API gateway details, authentication headers, version reporting, response trimming, and common formatting.

## Prerequisites

Check that the command and API key are available before making a request:

```bash
command -v openweread
test -n "$WEREAD_API_KEY"
```

If `openweread` is missing, ask the user to install it:

```bash
npm i -g openweread
```

If `WEREAD_API_KEY` is missing, ask the user to set it:

```bash
export WEREAD_API_KEY=<your_api_key>
```

Do not ask the user for the raw key unless they choose to provide it. The key is bound to their WeRead identity.

## Command Rules

- Use `--json` whenever you need reliable parsing, aggregation, filtering, or exact counts.
- Use human-readable output for simple lookups where the CLI already formats the answer clearly.
- Add `--verbose` only when debugging request/response issues; it prints API details to stderr.
- When the user gives a book title but the target command needs a `bookId`, run `openweread --json search "<title>"` first and pick the best matching result. If matches are ambiguous, show numbered choices.
- Keep the selected `bookId` in conversation context for follow-up requests.
- Convert timestamps to readable dates and durations to hours/minutes when presenting JSON output.
- If the CLI reports an upgrade prompt from the API, pause the task and tell the user to upgrade before retrying.

## Core Commands

```bash
openweread search "<keyword>"                # search ebooks by default
openweread book info <bookId>                # book metadata
openweread book chapters <bookId>            # table of contents
openweread book progress <bookId>            # current reading progress
openweread shelf                             # shelf, including ebooks and albums
openweread stats --mode monthly              # weekly|monthly|annually|overall
openweread notes list                        # notebook overview
openweread notes bookmarks <bookId>          # highlights for one book
openweread reviews <bookId> --type 1         # public reviews; 1=recommended
openweread recommend                         # personalized recommendations
openweread similar <bookId>                  # similar books
openweread profile                           # shelf summary + recent progress
```

Global options go before the subcommand:

```bash
openweread --json shelf
openweread --verbose --json book progress <bookId>
```

## Intent Mapping

| User wants                                                 | Command                                         |
| ---------------------------------------------------------- | ----------------------------------------------- | ------- | -------- | -------- |
| Search or find a book                                      | `openweread search "<keyword>"`                 |
| Broad search, authors, articles, audio, or unspecified tab | `openweread search "<keyword>" --scope <scope>` |
| Book details                                               | `openweread book info <bookId>`                 |
| Chapters or table of contents                              | `openweread book chapters <bookId>`             |
| Reading progress                                           | `openweread book progress <bookId>`             |
| Shelf contents or shelf count                              | `openweread --json shelf`                       |
| Reading stats                                              | `openweread stats --mode weekly                 | monthly | annually | overall` |
| Notebook overview or note counts                           | `openweread --json notes list`                  |
| Highlights/export highlights for one book                  | `openweread notes bookmarks <bookId>`           |
| Public reviews/comments                                    | `openweread reviews <bookId> --type <n>`        |
| Personalized recommendations                               | `openweread recommend`                          |
| Similar books                                              | `openweread similar <bookId>`                   |
| Reading profile                                            | `openweread profile --recent <n>`               |

Search scopes:

| scope | Meaning           |
| ----- | ----------------- |
| `0`   | all tabs          |
| `10`  | ebooks, default   |
| `14`  | audiobooks/albums |
| `6`   | authors           |

Review types:

| type | Meaning     |
| ---- | ----------- |
| `0`  | all         |
| `1`  | recommended |
| `2`  | negative    |
| `3`  | latest      |
| `4`  | neutral     |

## Presentation Rules

- Search and recommendation results should be numbered and include title, author, rating if available, and `bookId`.
- Book links can be shown as `weread://reading?bId=<bookId>` when useful.
- Chapter links can be shown as `weread://reading?bId=<bookId>&chapterUid=<chapterUid>` when chapter JSON includes `chapterUid`.
- For shelf totals, count visible shelf entries as `books.length + albums.length + (mp is non-empty ? 1 : 0)`. Albums are audiobooks and count as shelf entries.
- For note totals from `notes list`, a book's total notes are `reviewCount + noteCount + bookmarkCount`. `noteCount` means highlights, not total notes.
- `book progress` reports `progress` as an integer percentage from 0 to 100; `1` means 1%, not finished.
- Reading time fields are seconds unless the CLI has already formatted them.

## JSON Workflows

Resolve a title to a `bookId`:

```bash
openweread --json search "三体"
```

Then inspect the first ebook group result:

```jq
.results[] | select(.scope == 10) | .books[] | {title: .bookInfo.title, author: .bookInfo.author, bookId: .bookInfo.bookId, rating: .newRating}
```

Calculate shelf totals:

```bash
openweread --json shelf
```

Use:

```text
total = books.length + albums.length + (mp has keys ? 1 : 0)
```

Export highlights:

```bash
openweread --json notes bookmarks <bookId>
```

Use `updated[].markText` as highlight text. If the JSON includes `chapterUid` and `range`, you may build a deep link:

```text
weread://bestbookmark?bookId=<bookId>&chapterUid=<chapterUid>&rangeStart=<start>&rangeEnd=<end>
```

## Error Handling

- Authentication errors usually mean `WEREAD_API_KEY` is missing, expired, or invalid.
- API errors are printed as `微信读书接口错误 (errcode=...)`.
- If output is unexpected, rerun the same command with `--verbose --json` and inspect the request/response.
- For unsupported CLI needs such as arbitrary pagination parameters, explain the current CLI limitation and use the closest available command instead.
