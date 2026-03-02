import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/project/create
 * Creates a minimal project and returns userId + createdAt for redirect to project detail page.
 * Body: { name?: string } - optional project name
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const text = name || 'New Project'

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profileData: true },
    })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const pd = user.profileData ? (JSON.parse(user.profileData) as Record<string, unknown>) : {}
    const projects = Array.isArray(pd.projects) ? [...(pd.projects as Record<string, unknown>[])] : []
    const createdAt = Date.now()
    projects.push({
      text,
      visibility: 'public',
      showOnPlaza: false,
      peopleNeeded: [],
      stage: 'Idea',
      createdAt,
    })

    const merged = { ...pd, projects }
    await prisma.user.update({
      where: { id: user.id },
      data: { profileData: JSON.stringify(merged) },
    })

    return NextResponse.json({ ok: true, userId: user.id, createdAt })
  } catch (e) {
    console.error('[project/create] POST failed:', e)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
