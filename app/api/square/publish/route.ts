import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    const image = typeof body?.image === 'string' ? body.image.trim() : ''
    if (!text && !image) {
      return NextResponse.json({ error: 'Content or image is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, profileData: true },
    })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const pd = user.profileData ? JSON.parse(user.profileData) as Record<string, unknown> : {}
    const projects = Array.isArray(pd.projects) ? [...(pd.projects as Record<string, unknown>[])] : []
    projects.push({
      text,
      image: image || undefined,
      visibility: 'public',
      showOnPlaza: true,
      peopleNeeded: [],
      createdAt: Date.now(),
    })

    const merged = { ...pd, projects }
    await prisma.user.update({
      where: { id: user.id },
      data: { profileData: JSON.stringify(merged) },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[square/publish] POST failed:', e)
    return NextResponse.json({ error: '发布失败' }, { status: 500 })
  }
}

