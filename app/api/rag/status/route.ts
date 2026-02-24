import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRagChunkCount, searchRagChunks, answerFromChunks } from '@/lib/ragNeon'

/** RAG 已配置 = 有 Ark API Key 做 embedding */
function isRagEmbeddingConfigured(): boolean {
  return !!(process.env.ARK_API_KEY || '').trim()
}

/**
 * GET: RAG 状态（Neon pgvector，无 Python 后端）
 * 返回当前用户的 RAG 块数量，可选 testQuery 测试回答
 */
export async function GET(request: NextRequest) {
  const configured = isRagEmbeddingConfigured()
  const testQuery = request.nextUrl.searchParams.get('testQuery') || ''

  let processedCount: number | undefined
  let testAnswer: string | undefined
  let error: string | undefined

  const session = await getServerSession(authOptions)
  if (session?.user?.email) {
    try {
      const { prisma } = await import('@/lib/prisma')
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      if (user) {
        processedCount = await getRagChunkCount(user.id)
        if (testQuery && configured) {
          const chunks = await searchRagChunks(user.id, testQuery)
          testAnswer = await answerFromChunks(testQuery, chunks)
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : '查询失败'
    }
  } else {
    processedCount = 0
  }

  const hint = !configured
    ? '在 .env 中添加 ARK_API_KEY（火山方舟）；Neon 需执行 CREATE EXTENSION IF NOT EXISTS vector; 首次添加内容时会自动建 rag_chunks 表（或执行 prisma/rag-pgvector.sql）'
    : processedCount !== undefined && processedCount === 0
      ? 'RAG 已就绪（Neon），但索引为空。请在「增加数据库」里粘贴文本添加内容。'
      : undefined

  return NextResponse.json({
    configured,
    reachable: true,
    processedCount: processedCount ?? 0,
    testQuery: testQuery || undefined,
    testAnswer: testAnswer !== undefined ? testAnswer : undefined,
    error: error || undefined,
    hint,
  })
}
