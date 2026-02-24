import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { insertRagChunk } from '@/lib/ragNeon'

export const dynamic = 'force-dynamic'

/**
 * GET: 返回当前用户待同步到 RAG 的文本条数
 * POST: 将 profileData.pendingRagTexts 逐条写入 Neon RAG（embedding + 入库），成功后从 profile 中清除（无 Python 后端）
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: '未登录' }, { status: 401 })
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { profileData: true },
    })
    if (!user?.profileData) return NextResponse.json({ count: 0 })
    let pd: Record<string, unknown> = {}
    try {
      pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
    } catch {}
    const pending = Array.isArray(pd.pendingRagTexts) ? (pd.pendingRagTexts as { text: string }[]) : []
    return NextResponse.json({ count: pending.length })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return NextResponse.json({ error: '未登录' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profileData: true },
    })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    let pd: Record<string, unknown> = {}
    if (user.profileData) {
      try {
        pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
      } catch {}
    }
    const pending = Array.isArray(pd.pendingRagTexts) ? (pd.pendingRagTexts as { text: string; addedAt?: string }[]) : []
    if (pending.length === 0) return NextResponse.json({ synced: 0, failed: 0, remaining: 0, message: '没有待同步的文本' })

    const hasArk = !!(process.env.ARK_API_KEY || '').trim()
    if (!hasArk) {
      return NextResponse.json({
        synced: 0,
        failed: pending.length,
        remaining: pending.length,
        message: '未配置 ARK_API_KEY。请在 .env 中添加 ARK_API_KEY 并重启 npm run dev 后再点「同步到 RAG」。',
      })
    }

    let synced = 0
    let failed = 0
    let lastError: string | undefined
    const stillPending: { text: string; addedAt?: string }[] = []
    for (const item of pending) {
      const text = typeof item.text === 'string' ? item.text.trim() : ''
      if (!text) continue
      const result = await insertRagChunk(user.id, text)
      if (result.ok) synced++
      else {
        failed++
        stillPending.push(item)
        if (result.message) lastError = result.message
      }
    }

    pd.pendingRagTexts = stillPending
    await prisma.user.update({
      where: { id: user.id },
      data: { profileData: JSON.stringify(pd) },
    })

    const failHint = failed > 0 ? (lastError ? ` ${lastError}` : ' 请先点「初始化 RAG 表」或查看终端 [RAG] 日志。') : ''
    return NextResponse.json({
      synced,
      failed,
      remaining: stillPending.length,
      lastError: lastError || undefined,
      message:
        synced > 0
          ? `已同步 ${synced} 条到 RAG${failed > 0 ? `，${failed} 条失败（已保留待重试）${failHint}` : ''}`
          : failed > 0
            ? `同步失败（${failed} 条）${failHint}`
            : '没有可同步的文本',
    })
  } catch (e) {
    console.error('❌ [RAG sync-pending] POST error:', e)
    return NextResponse.json({ error: '同步失败' }, { status: 500 })
  }
}
