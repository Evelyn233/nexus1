import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/project/bookmark
 * Toggle bookmark. Returns { bookmarked, count }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { targetUserId, projectCreatedAt } = body as {
      targetUserId?: string
      projectCreatedAt?: number | string
    }

    if (!targetUserId || projectCreatedAt === undefined) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const ts = typeof projectCreatedAt === 'string' ? BigInt(projectCreatedAt) : BigInt(projectCreatedAt as number)

    const existing = await prisma.projectBookmark.findUnique({
      where: {
        userId_targetUserId_projectCreatedAt: {
          userId: me.id,
          targetUserId,
          projectCreatedAt: ts,
        },
      },
    })

    if (existing) {
      await prisma.projectBookmark.delete({ where: { id: existing.id } })
    } else {
      await prisma.projectBookmark.create({
        data: {
          userId: me.id,
          targetUserId,
          projectCreatedAt: ts,
        },
      })
    }

    const count = await prisma.projectBookmark.count({
      where: { targetUserId, projectCreatedAt: ts },
    })

    return NextResponse.json({ bookmarked: !existing, count })
  } catch (e) {
    console.error('[project/bookmark] POST failed:', e)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}

/**
 * GET /api/project/bookmark?targetUserId=xxx&projectCreatedAt=xxx
 * Returns { bookmarked, count }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    const projectCreatedAt = searchParams.get('projectCreatedAt')
    if (!targetUserId || !projectCreatedAt) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const ts = BigInt(projectCreatedAt)

    let bookmarked = false
    if (session?.user?.email) {
      const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
      if (me) {
        const record = await prisma.projectBookmark.findUnique({
          where: {
            userId_targetUserId_projectCreatedAt: {
              userId: me.id,
              targetUserId,
              projectCreatedAt: ts,
            },
          },
        })
        bookmarked = !!record
      }
    }

    const count = await prisma.projectBookmark.count({
      where: { targetUserId, projectCreatedAt: ts },
    })

    return NextResponse.json({ bookmarked, count })
  } catch (e) {
    console.error('[project/bookmark] GET failed:', e)
    return NextResponse.json({ error: '读取失败' }, { status: 500 })
  }
}
