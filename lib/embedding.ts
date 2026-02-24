/**
 * 文本向量化：火山方舟 Ark 多模态 Embeddings（/embeddings/multimodal），供 Neon RAG 使用。
 * 纯文本也走该接口，input 格式为 [ { type: "text", text: "..." } ]。
 * 需在 .env 配置 ARK_API_KEY（Bearer）、ARK_EMBEDDING_MODEL（多模态 embedding 接入点 ID，ep-xxx）。
 */
const ARK_EMBEDDING_URL = 'https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal'
/** 多模态 embedding 推理接入点 ID（ep-xxx） */
const ARK_MODEL = (process.env.ARK_EMBEDDING_MODEL || '').trim() || 'ep-20260204162707-b9jsk'
/** 向量维度，需与 Neon rag_chunks.embedding 一致；Ark 支持 512/1024/2048 等 */
const ARK_DIM = parseInt(process.env.ARK_EMBEDDING_DIM || '1024', 10) || 1024

/** 当前使用的向量维度（pgvector 表需一致） */
export function getEmbeddingDimension(): number {
  return ARK_DIM
}

async function embedWithArk(input: string | string[]): Promise<number[][] | null> {
  const apiKey = (process.env.ARK_API_KEY || '').trim()
  if (!apiKey) return null
  const isBatch = Array.isArray(input)
  const texts = isBatch ? (input as string[]).map((t) => t.trim().slice(0, 8000)).filter(Boolean) : [input].map((t) => (t as string).trim().slice(0, 8000)).filter(Boolean)
  if (texts.length === 0) return null
  try {
    // 多模态接口：input 为 [ { type: "text", text: "..." } ]，纯文本时每条一个 text
    const inputBody = texts.map((t) => ({ type: 'text' as const, text: t }))
    const res = await fetch(ARK_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ARK_MODEL,
        input: inputBody,
        dimensions: ARK_DIM,
      }),
      signal: AbortSignal.timeout(texts.length > 1 ? 30000 : 15000),
    })
    const raw = await res.text()
    if (!res.ok) {
      console.error('[RAG] Ark embedding 请求失败:', res.status, raw.slice(0, 500))
      return null
    }
    let parsed: { data?: { embedding?: number[] } | { embedding?: number[] }[] }
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error('[RAG] Ark 返回非 JSON:', raw.slice(0, 200))
      return null
    }
    const data = parsed?.data
    let vecs: number[][]
    // 多模态接口返回 data 为单个对象 { embedding: [...] }，不是数组
    if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray((data as { embedding?: number[] }).embedding)) {
      vecs = [(data as { embedding: number[] }).embedding]
    } else if (Array.isArray(data)) {
      vecs = (data as { embedding?: number[] }[])
        .map((item) => item?.embedding)
        .filter((v): v is number[] => Array.isArray(v) && v.length > 0)
    } else {
      console.error('[RAG] Ark 返回格式异常，无 data.embedding:', raw.slice(0, 300))
      return null
    }
    if (vecs.length !== texts.length) {
      console.error('[RAG] Ark 返回向量条数不符:', vecs.length, '!=', texts.length)
      return null
    }
    // 若 API 返回维度大于配置，截断到 ARK_DIM，与 Neon vector(N) 一致
    const dim = ARK_DIM
    return vecs.map((v) => (v.length > dim ? v.slice(0, dim) : v))
  } catch (e) {
    console.error('[RAG] Ark embedding 请求异常:', e instanceof Error ? e.message : e)
    return null
  }
}

export async function embedText(text: string): Promise<number[] | null> {
  const t = text.trim().slice(0, 8000)
  if (!t) return null
  const vecs = await embedWithArk(t)
  if (!vecs || vecs.length === 0) return null
  return vecs[0]
}

export async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  if (texts.length === 0) return []
  const inputs = texts.map((t) => t.trim().slice(0, 8000)).filter(Boolean)
  if (inputs.length === 0) return texts.map(() => null)
  const vecs = await embedWithArk(inputs)
  if (!vecs || vecs.length !== inputs.length) return inputs.map(() => null)
  return vecs.map((v) => (Array.isArray(v) && v.length > 0 ? v : null))
}
