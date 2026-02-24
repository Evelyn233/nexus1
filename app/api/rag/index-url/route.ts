import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { insertRagChunk } from '@/lib/ragNeon'

const MAX_URL_TEXT = 100000

/** 抓取 URL 并提取纯文本（简单去标签） */
async function fetchUrlText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProfileRAG/1.0)' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const stripped = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.slice(0, MAX_URL_TEXT)
}

/**
 * POST: 添加链接内容到 Neon RAG（抓取 URL → 提取文本 → embedding 入库，无 Python 后端）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

    const text = await fetchUrlText(url)
    if (!text) return NextResponse.json({ error: 'No text content from URL' }, { status: 400 })

    const result = await insertRagChunk(user.id, text)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message || 'RAG 写入失败，请确认 ARK_API_KEY 与 pgvector 表已配置' },
        { status: 500 }
      )
    }
    return NextResponse.json({ ok: true, message: 'URL content indexed' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'RAG index-url failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
