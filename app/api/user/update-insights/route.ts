import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateInsightsFromQA } from '@/lib/insightsFromQA'

export const dynamic = 'force-dynamic'

function getUserId(session: { user?: { id?: string; email?: string } }): Promise<string | null> {
  const id = (session?.user as { id?: string })?.id
  const email = session?.user?.email
  if (id) return prisma.user.findUnique({ where: { id }, select: { id: true } }).then(u => u?.id ?? null)
  if (email) return prisma.user.findFirst({ where: { email }, select: { id: true } }).then(u => u?.id ?? null)
  return Promise.resolve(null)
}

/**
 * POST: 根据本次输入的 Q&A 更新洞察和标签（每次输入都更新）
 * body: { question?: string, answer?: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session ? await getUserId(session) : null
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const question = typeof body.question === 'string' ? body.question.trim() || null : null
    const answer = typeof body.answer === 'string' ? body.answer.trim() || null : null
    if (!question && !answer) {
      return NextResponse.json({ insights: [], tags: [] })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileData: true },
    })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const extracted = await generateInsightsFromQA(question, answer)
    if (extracted.insights.length === 0 && extracted.tags.length === 0) {
      const pd = user.profileData ? (typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData) : {}
      const existingInsights = Array.isArray(pd.insights) ? pd.insights : []
      const existingTags = Array.isArray(pd.tags) ? pd.tags : []
      return NextResponse.json({ insights: existingInsights, tags: existingTags })
    }

    let pd: Record<string, unknown> = {}
    if (user.profileData) {
      try {
        pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
      } catch {}
    }
    const existingInsights = Array.isArray(pd.insights) ? (pd.insights as string[]) : []
    const existingTags = Array.isArray(pd.tags) ? (pd.tags as string[]) : []
    const mergedInsights = [...new Set([...existingInsights, ...extracted.insights])]
    const mergedTags = extracted.tags.length ? [...new Set([...existingTags, ...extracted.tags])] : existingTags

    pd.insights = mergedInsights
    if (mergedTags.length) pd.tags = mergedTags

    await prisma.user.update({
      where: { id: userId },
      data: { profileData: JSON.stringify(pd) },
    })

    return NextResponse.json({ insights: mergedInsights, tags: mergedTags })
  } catch (e) {
    console.error('[update-insights]', e)
    return NextResponse.json({ error: '更新洞察/标签失败' }, { status: 500 })
  }
}
