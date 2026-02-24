/**
 * RAG 用 Neon（pgvector）：建索引、检索、统计，无 Python 后端
 */
import prisma from '@/lib/prisma'
import { embedText, getEmbeddingDimension } from '@/lib/embedding'

const TABLE = 'rag_chunks'
const TOP_K = 5

/** 确保 pgvector 扩展和表存在（首次调用时执行；维度随 ARK_EMBEDDING_DIM，默认 1024）。失败时抛出错误供 /api/rag/init 返回提示。 */
export async function ensureRagTable(): Promise<void> {
  const dim = getEmbeddingDimension()
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector')
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id    TEXT NOT NULL,
      text       TEXT NOT NULL,
      embedding  vector(${dim}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS idx_rag_chunks_user_id ON rag_chunks(user_id)'
  )
}

export type InsertRagResult = { ok: true } | { ok: false; reason: 'embed' | 'db'; message: string }

/** 插入一条文本：先确保表存在，再 embedding 再写入 Neon；失败时返回原因供接口提示 */
export async function insertRagChunk(userId: string, text: string): Promise<InsertRagResult> {
  try {
    await ensureRagTable()
  } catch (e) {
    console.warn('[RAG] ensureRagTable 失败（无建表权限时正常）:', e instanceof Error ? e.message : e)
  }
  const embedding = await embedText(text)
  if (!embedding) {
    console.error('[RAG] insertRagChunk 失败：embedText 返回空')
    return {
      ok: false,
      reason: 'embed',
      message: 'Ark 未返回向量。若终端显示 404 InvalidEndpointOrModel，请在火山方舟控制台创建「文本向量化」推理接入点，将接入点 ID（ep-xxx）填入 .env 的 ARK_EMBEDDING_MODEL；否则检查 ARK_API_KEY 并重启 npm run dev。',
    }
  }
  const id = `rc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const vecStr = `[${embedding.join(',')}]`
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO rag_chunks (id, user_id, text, embedding, created_at) VALUES ($1, $2, $3, $4::vector, now())`,
      id,
      userId,
      text.trim().slice(0, 50000),
      vecStr
    )
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[RAG] insertRagChunk 写入数据库失败:', msg)
    if (msg.includes('does not exist') || msg.includes('relation')) {
      return { ok: false, reason: 'db', message: 'RAG 表不存在，请先点「初始化 RAG 表」或在 Neon SQL Editor 执行 prisma/rag-pgvector.sql' }
    }
    if (msg.includes('dimensions') || msg.includes('vector')) {
      return { ok: false, reason: 'db', message: `表维度不匹配，请在 Neon 执行：ALTER TABLE rag_chunks ALTER COLUMN embedding TYPE vector(${getEmbeddingDimension()});` }
    }
    return { ok: false, reason: 'db', message: `数据库写入失败：${msg.slice(0, 80)}` }
  }
}

/** 按用户检索：embed 查询 → 向量相似度 → 返回 top-k 条原文 */
export async function searchRagChunks(userId: string, query: string): Promise<string[]> {
  const embedding = await embedText(query)
  if (!embedding) return []
  const vecStr = `[${embedding.join(',')}]`
  try {
    const rows = await prisma.$queryRawUnsafe<{ text: string }[]>(
      `SELECT text FROM rag_chunks WHERE user_id = $1 ORDER BY embedding <=> $2::vector LIMIT ${TOP_K}`,
      userId,
      vecStr
    )
    return Array.isArray(rows) ? rows.map((r) => r?.text).filter(Boolean) : []
  } catch {
    return []
  }
}

/** 当前用户 RAG 块数量 */
export async function getRagChunkCount(userId: string): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) AS count FROM rag_chunks WHERE user_id = $1',
      userId
    )
    const n = rows?.[0]?.count
    return n != null ? Number(n) : 0
  } catch {
    return 0
  }
}

/** 用检索结果 + DeepSeek 生成答案 */
export async function answerFromChunks(query: string, chunks: string[]): Promise<string> {
  const apiKey = (process.env.DEEPSEEK_API_KEY || '').trim()
  if (!apiKey || chunks.length === 0) return chunks.join('\n\n') || ''
  const context = chunks.join('\n\n---\n\n')
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              '你根据下面检索到的内容简洁回答用户问题。若内容不足以回答，可简短说明并建议用户补充资料。',
          },
          { role: 'user', content: `【检索内容】\n${context}\n\n【用户问题】\n${query}` },
        ],
        max_tokens: 512,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return chunks.join('\n\n') || ''
    const data = await res.json()
    const answer = data?.choices?.[0]?.message?.content?.trim()
    return answer || chunks.join('\n\n') || ''
  } catch {
    return chunks.join('\n\n') || ''
  }
}
