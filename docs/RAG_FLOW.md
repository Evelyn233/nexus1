# RAG 流程说明（Neon + Ark Embedding + DeepSeek）

## 一、当前流程概览

```
用户添加内容（文本 / 文件 / URL）
    → POST /api/rag/index 或 index-file 或 index-url
    → embedText(text)  [火山方舟 Ark]
    → 写入 Neon rag_chunks（pgvector）

用户提问「Query my database」
    → POST /api/rag/query { query }
    → embedText(query)  [同上]
    → 向量相似度检索 rag_chunks（ORDER BY embedding <=> $vec）
    → answerFromChunks(query, chunks)  [DeepSeek 生成答案]
    → 返回 { answer }
```

- **Embedding**：仅用火山方舟 Ark（`ARK_API_KEY`），不用 OpenAI。
- **存储**：Neon PostgreSQL + `pgvector` 扩展，表 `rag_chunks`。
- **生成答案**：DeepSeek（`DEEPSEEK_API_KEY`）。

---

## 二、环境变量（.env）

| 变量 | 用途 | 必填 |
|------|------|------|
| **ARK_API_KEY** | 火山方舟 Embedding | 是 |
| **DEEPSEEK_API_KEY** | RAG 问答生成 | 是（要出答案就必填） |
| **DATABASE_URL** | Neon 连接 | 是 |

可选：

- **`ARK_EMBEDDING_MODEL`**：默认 `doubao-embedding-text-240715`。若 Ark 返回 404 InvalidEndpointOrModel，需改为**推理接入点 ID**：火山方舟控制台 → 在线推理 / 推理接入点 → 创建「文本向量化」接入点（选择 doubao-embedding 等）→ 复制接入点 ID（形如 `ep-2024xxxx-xxxxx`）→ 在 .env 设置 `ARK_EMBEDDING_MODEL=ep-2024xxxx-xxxxx`。
- `ARK_EMBEDDING_DIM`：默认 `1024`（与 Ark 模型一致）

---

## 三、数据库（Neon）

1. 在 Neon SQL Editor 执行一次：
   - `CREATE EXTENSION IF NOT EXISTS vector;`
   - 表 `rag_chunks` 由代码里的 `ensureRagTable()` 按当前 embedding 维度创建（Ark 1024 / OpenAI 1536）。

2. 若**之前**曾用 1536 维建过表，需执行一次：
   ```sql
   ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(1024);
   ```

---

## 四、API 与前端对应

| 接口 | 方法 | 作用 |
|------|------|------|
| `/api/rag/status` | GET | 是否配置 embedding、当前用户 RAG 条数、可选 testQuery 测答 |
| `/api/rag/index` | POST | 单条文本入库（embedding + 写入 Neon） |
| `/api/rag/sync-pending` | POST | 把 profile 里「待同步」文本批量写入 RAG |
| `/api/rag/index-file` | POST | 上传 Word/PDF，提取文本后入库 |
| `/api/rag/index-url` | POST | 抓取 URL 正文后入库 |
| `/api/rag/query` | POST | 用 query 检索 + DeepSeek 生成答案 |

Profile 页「增加数据库」里：粘贴文本、上传文件、填 URL 都会走上述接口；右下角「Query my database」走 `/api/rag/query`。

---

## 五、还需要什么（自检）

1. **.env**：已配 `ARK_API_KEY`（你已加）、`DEEPSEEK_API_KEY`、`DATABASE_URL`。
2. **Neon**：已开 `vector` 扩展；若从未建过 `rag_chunks`，第一次调用 index 时会由 `ensureRagTable()` 建表（需有建表权限）。
3. **若表已存在且是 1536 维**：改用 Ark 后执行一次 `ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(1024);`。
4. **无需**：Python RAG 服务、OPENAI_API_KEY。

以上理清后，流程就是：**配置 → Neon 建表/改维 → 加内容 → 提问**。

---

## 六、流程检查（各环节在干嘛）

| 环节 | 在干嘛 | 依赖 |
|------|--------|------|
| **lib/embedding.ts** | 文本 → 向量（仅 Ark，`embedText` / `embedTexts`） | ARK_API_KEY |
| **lib/ragNeon.ts** | `ensureRagTable()` 建扩展 + 表（1024 维）；`insertRagChunk` 先建表再 embed 再 INSERT；`searchRagChunks` embed 查询后向量检索；`getRagChunkCount` 统计条数；`answerFromChunks` 用 DeepSeek 根据检索内容生成答案 | ARK_API_KEY、DATABASE_URL、DEEPSEEK_API_KEY |
| **POST /api/rag/index** | 单条文本：insertRagChunk；失败则落 profile.pendingRagTexts | 登录、Ark、Neon |
| **POST /api/rag/index-file** | 上传 Word/PDF → 提取文本 → insertRagChunk | 同上 |
| **POST /api/rag/index-url** | 抓 URL 正文 → insertRagChunk | 同上 |
| **POST /api/rag/sync-pending** | 把 profile.pendingRagTexts 逐条 insertRagChunk，然后清空 pending | 同上 |
| **GET /api/rag/status** | 是否配置 Ark、当前用户 RAG 条数、可选 testQuery 测答 | 登录 |
| **POST /api/rag/query** | searchRagChunks → answerFromChunks；无检索结果时返回友好提示 | 登录、Ark、Neon、DeepSeek |
| **profile-answer getRagSnippet** | 访客问 profile 主人时：用主人 userId 做 searchRagChunks + answerFromChunks，结果拼进上下文 | 同上 |

**已修复的问题**：① 首次加内容时表不存在会报错 → 改为在 `insertRagChunk` 开头调用 `ensureRagTable()` 自动建表；② `prisma/rag-pgvector.sql` 仍为 1536 维 → 改为 1024 与 Ark 一致；③ 注释/提示仍写 OpenAI → 已改为 Ark；④ 检索为空时返回空字符串 → 改为返回「暂无相关检索内容」的提示。
