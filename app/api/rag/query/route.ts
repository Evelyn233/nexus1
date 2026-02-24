import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchRagChunks, answerFromChunks } from '@/lib/ragNeon'

/**
 * POST: 查询 RAG（Neon pgvector + Ark embedding + DeepSeek 生成答案）
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const { prisma } = await import('@/lib/prisma')
  let sessionUserId: string | null = null
  if (session?.user?.email) {
    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    sessionUserId = sessionUser?.id ?? null
  }

  // 访客在公开页可传 targetUserId 查询 TA 的资料（无需登录）；登录用户不传则查自己的
  const targetUserIdParam = typeof body?.targetUserId === 'string' ? body.targetUserId.trim() : ''
  const targetUserId = targetUserIdParam || sessionUserId
  if (!targetUserId) {
    return NextResponse.json({ error: '未登录且未指定查询对象，请登录或打开 TA 的主页再试' }, { status: 401 })
  }
  const isOwner = sessionUserId !== null && targetUserId === sessionUserId

  try {
    const chunks = await searchRagChunks(targetUserId, query)
    const answer = await answerFromChunks(query, chunks)
    let finalAnswer =
      chunks.length === 0 && !answer.trim()
        ? isOwner
          ? '暂无与「' + query.slice(0, 30) + (query.length > 30 ? '…' : '') + '」相关的资料，无法替 TA 回答。去给 TA 发条消息直接问吧～'
          : 'TA 的资料里暂无与「' + query.slice(0, 20) + (query.length > 20 ? '…' : '') + '」相关的内容，可直接发消息问 TA～'
        : answer.replace(/\r/g, '')
    const suggestFill =
      /没有找到|暂无|建议您补充|建议.*补充|建议.*完善/.test(finalAnswer)
    const noChunks = chunks.length === 0
    let askUser = suggestFill
    let showMessageToTa = false
    if ((suggestFill || noChunks) && !isOwner) {
      if (suggestFill && !noChunks) {
        finalAnswer = 'TA 的资料里暂无相关描述。若想了解 TA 的这方面信息，可直接发消息问 TA～'
      }
      askUser = false
      showMessageToTa = true
    }
    return NextResponse.json({ ok: true, answer: finalAnswer, askUser, showMessageToTa })
  } catch (e) {
    console.error('[RAG query]', e)
    return NextResponse.json({ error: 'RAG query failed' }, { status: 500 })
  }
}
