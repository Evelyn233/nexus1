-- 在 Neon SQL Editor 中执行一次即可（或 npx prisma db execute --file prisma/rag-pgvector.sql）
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG 文本块表：按用户存，用于「增加数据库」+ 「Query my database」（user_id 对应 users.id；Ark 默认 1024 维，可与 ARK_EMBEDDING_DIM 一致）
CREATE TABLE IF NOT EXISTS rag_chunks (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT NOT NULL,
  text       TEXT NOT NULL,
  embedding  vector(1024) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_user_id ON rag_chunks(user_id);
-- 向量索引：数据量较大时再建，首次可注释掉
-- CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
