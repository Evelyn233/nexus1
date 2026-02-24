import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { insertRagChunk } from '@/lib/ragNeon'

/** RAG 不可用时，将文本保存到当前用户的 profileData.pendingRagTexts，避免丢失 */
async function saveTextToProfileFallback(text: string): Promise<boolean> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return false
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profileData: true },
    })
    if (!user) return false
    let pd: Record<string, unknown> = {}
    if (user.profileData) {
      try {
        pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
      } catch {}
    }
    const pending = Array.isArray(pd.pendingRagTexts) ? (pd.pendingRagTexts as { text: string; addedAt?: string }[]) : []
    pending.push({ text: text.trim(), addedAt: new Date().toISOString() })
    pd.pendingRagTexts = pending
    await prisma.user.update({
      where: { id: user.id },
      data: { profileData: JSON.stringify(pd) },
    })
    return true
  } catch {
    return false
  }
}

/**
 * POST: 添加文本到 RAG（Neon + pgvector + Ark embedding）
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const text = typeof body?.text === 'string' ? body.text : ''
  if (!text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

  const hasArk = !!(process.env.ARK_API_KEY || '').trim()
  if (!hasArk) {
    const saved = await saveTextToProfileFallback(text)
    if (saved) {
      return NextResponse.json({
        ok: true,
        savedToProfile: true,
        ragUnavailable: true,
        message: '未配置 ARK_API_KEY。请在 .env 中添加 ARK_API_KEY 并重启 npm run dev，然后点「同步到 RAG」。',
      })
    }
    return NextResponse.json(
      { error: '请先在 .env 中配置 ARK_API_KEY 并重启 npm run dev' },
      { status: 503 }
    )
  }

  const result = await insertRagChunk(user.id, text.trim())
  if (result.ok) {
    return NextResponse.json({ ok: true, message: 'Indexed successfully' })
  }

  const saved = await saveTextToProfileFallback(text)
  if (saved) {
    return NextResponse.json({
      ok: true,
      savedToProfile: true,
      ragUnavailable: true,
      message: '文本已保存。请先点「初始化 RAG 表」，再点「同步到 RAG」即可入库。',
    })
  }
  return NextResponse.json(
    { error: '添加失败；请先点「初始化 RAG 表」，或查看终端 [RAG] 日志' },
    { status: 500 }
  )
}
