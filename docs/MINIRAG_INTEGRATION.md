# MiniRAG Integration (Profile Database)

This doc describes how the profile app uses [MiniRAG](https://github.com/HKUDS/MiniRAG) (HKUDS) for the **增加数据库** and **Query my database** features.

## RAG 和 Prisma 冲突吗？能融合吗？

**不冲突，已经融合。**

| 组件 | 作用 | 端口/存储 |
|------|------|-----------|
| **Prisma** | Next.js 的 ORM，存用户、登录、个人资料、消息等 | 无单独端口，连你的 PostgreSQL（如 Neon） |
| **RAG 服务** | 只做「增加数据库」里的 URL/文本索引 + 「Query my database」的检索回答 | 单独进程，默认 `http://localhost:8000`，索引存本地 `rag_storage/` |

- 用户信息、登录状态 **始终在 Prisma（数据库）里**，和 RAG 无关。
- RAG 不存用户账号，只存你添加的链接/文本内容，用来回答「Query my database」。
- 融合方式：Next.js 用 Prisma 做登录和用户数据；需要查「我的数据库」时，由 Next.js 的 `/api/rag/query` 去调 RAG 服务，再把结果展示给当前登录用户。

## 怎么登录？用户信息在 Prisma 里

登录完全走 **Next.js + Prisma**，和 RAG 服务无关：

1. 启动 **Next.js 应用**（profile 项目），确保 `.env` 里配置了 `DATABASE_URL`（连 Prisma 用的数据库）。
2. 在浏览器打开 **登录页**：`/auth/signin`（例如 `http://localhost:3000/auth/signin`）。
3. 用你在 Prisma 里有的账号（邮箱/密码或手机号等）登录即可。

用户信息在 Prisma 的 `User` 等表里；RAG 服务不需要知道「谁登录」，只负责根据已索引内容回答查询。

## Architecture

1. **Python RAG service** (`profile/rag-service/`) — FastAPI app that runs MiniRAG:
   - `POST /index` — index raw text
   - `POST /index-url` — fetch URL, extract text, index
   - `POST /query` — natural-language query → answer

2. **Next.js API routes** — Proxy to the Python service (server-side only, no client CORS):
   - `POST /api/rag/index` → RAG service `/index`
   - `POST /api/rag/index-url` → RAG service `/index-url`
   - `POST /api/rag/query` → RAG service `/query`

3. **Profile page** — Uses the Next.js API:
   - When user adds a source (Word, LinkedIn, Notion, etc.) with a URL and clicks 添加, the app saves the source and calls `POST /api/rag/index-url` so MiniRAG indexes that URL’s content.
   - When user types in "Query my database" and submits:
     - First: local search over tags (if saved to DB), insights in DB, and Q&A saved to DB.
     - If no local matches: call `POST /api/rag/query` and show the result as "From RAG: …".
     - If still no answer: show "No matches" and the "Send to {username}" option.

## Setup

### 1. Run the RAG service

From the **profile** project root, the RAG app lives in `rag-service/`. You must run commands from inside that folder:

```bash
cd rag-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

If you run `pip install -r requirements.txt` from `profile/` (without `cd rag-service`), you'll get "No such file or directory: requirements.txt" because the file is in `profile/rag-service/requirements.txt`.

See `profile/rag-service/README.md` for env vars and options.

### 2. Configure Next.js

In the profile project root (or `.env.local`):

```env
RAG_API_URL=http://localhost:8000
```

Do **not** expose this URL to the client; the Next.js API routes proxy all calls.

### 3. Optional: different host/port

If the RAG service runs on another machine or port, set `RAG_API_URL` accordingly (e.g. `http://192.168.1.10:8000`). The Next.js server must be able to reach it.

## Behavior when RAG is unavailable

- If `RAG_API_URL` is unset, `/api/rag/*` returns **503** with a message that RAG is not configured.
- The profile page still works: local search and "Send to {username}" work as before; only the fallback RAG query is skipped when the service is down or not configured.
- Adding a database source still saves the URL in the profile; indexing to RAG is best-effort (errors are ignored in the UI).

## References

- [MiniRAG GitHub](https://github.com/HKUDS/MiniRAG)
- Profile RAG service: `profile/rag-service/`
- Next.js RAG API: `profile/app/api/rag/`
