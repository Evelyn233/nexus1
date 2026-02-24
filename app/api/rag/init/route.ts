import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ensureRagTable } from '@/lib/ragNeon'

export const dynamic = 'force-dynamic'

/**
 * POST: 一键初始化 RAG 表（在 Neon 中创建 pgvector 扩展和 rag_chunks 表）
 * 首次「添加文本到数据库」前点一次即可；若 Neon 不允许应用建表，会返回错误并提示去控制台执行 SQL。
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  try {
    await ensureRagTable()
    return NextResponse.json({ ok: true, message: 'RAG 表已就绪，可点「同步到 RAG」或直接添加文本。' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[RAG init]', msg)
    return NextResponse.json(
      {
        ok: false,
        error: '自动建表失败',
        hint: '请在 Neon 控制台 → SQL Editor 执行一次：CREATE EXTENSION IF NOT EXISTS vector; 然后执行 prisma/rag-pgvector.sql 中的建表语句（embedding 为 vector(1024)）。',
      },
      { status: 503 }
    )
  }
}
