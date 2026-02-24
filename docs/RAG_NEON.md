# RAG 已迁到 Neon（无 Python 后端）

「增加数据库」「Query my database」「同步到 RAG」现在全部在 **Next.js + Neon（pgvector）** 里完成，**不再依赖 Python RAG 服务**（`rag-service`、`start-rag.bat` 可不再使用）。

## 需要做的（一次性）

1. **在 Neon 里启用 pgvector 并建表**  
   在 [Neon Console](https://console.neon.tech) 打开你的项目 → SQL Editor，执行一次：

   ```sql
   -- 复制 prisma/rag-pgvector.sql 里的内容执行，或直接执行：
   CREATE EXTENSION IF NOT EXISTS vector;

   CREATE TABLE IF NOT EXISTS rag_chunks (
     id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     user_id    TEXT NOT NULL,
     text       TEXT NOT NULL,
     embedding  vector(1536) NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );
   CREATE INDEX IF NOT EXISTS idx_rag_chunks_user_id ON rag_chunks(user_id);
   ```

2. **配置 OpenAI Embedding**  
   在 `.env` 或 Vercel 环境变量里添加：

   ```env
   OPENAI_API_KEY=sk-你的OpenAI密钥
   ```

   - 用于把文本转成向量（`text-embedding-3-small`），建索引和检索都会用到。  
   - 若未配置，添加/同步会失败并提示「未配置 OPENAI_API_KEY」，文本会先存到 profile 的 `pendingRagTexts`。

3. **DeepSeek（可选）**  
   - 生成「Query my database」的回答仍用 `DEEPSEEK_API_KEY`（你已有）。  
   - 检索部分用 Neon pgvector，不再用 Python。

## 流程说明

- **添加文本到数据库**：Next.js API 调 OpenAI 得到 embedding → 写入 Neon 表 `rag_chunks`。  
- **Query my database**：用户问题 embed → 在 Neon 里按向量相似度查 `rag_chunks` → 取 top-k 条 → 用 DeepSeek 生成回答。  
- **同步到 RAG**：把 profile 里 `pendingRagTexts` 逐条 embed 并写入 `rag_chunks`，然后清空 pending。  
- **添加链接/上传文件**：先抓取 URL 或解析 PDF/Word 得到文本，再按「添加文本」同样流程写入 Neon。

## 怎么看同步数据库成功没成功

1. **页面上**  
   - 点「同步到 RAG」后：  
     - **成功**：在「增加数据库」区域下方会出现**绿色小字**，例如「已同步 X 条到 RAG」，约 5 秒后消失。  
     - **失败**：会出现**红色小字**「添加失败。xxx」或「同步失败」，同样约 5 秒后消失。  
   - 同一页里若已有 RAG 状态（例如「RAG 服务正常，索引中有 X 篇文档」），同步成功后会刷新，X 会变大。

2. **看 RAG 条数**  
   - 打开 Profile 页，在「Query my database」或 RAG 状态处看「索引中有 X 篇文档」。  
   - 或浏览器访问：`/api/rag/status`（需已登录），返回里的 `processedCount` 即当前用户已入库的 RAG 条数。

3. **终端**  
   - 服务端会打 `[RAG]` 相关日志；写入失败会有 `[RAG] insertRagChunk 写入数据库失败` 等报错。

## 部署到 Vercel

- 只部署 Next.js 即可，**不需要**再部署 Python RAG。  
- 在 Vercel 环境变量里配置：`OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`DATABASE_URL`（Neon 连接串）。  
- 确保在 Neon 里已执行过上面的 SQL（pgvector + `rag_chunks` 表）。

## 旧 Python RAG（rag-service）

- `rag-service`、`start-rag.bat`、`install-rag-deps.bat` 可保留作本地备用，**线上和默认流程已不再使用**。  
- 若希望完全移除，可删除 `rag-service` 目录及相关脚本；前端/API 已不依赖 `RAG_API_URL`。
