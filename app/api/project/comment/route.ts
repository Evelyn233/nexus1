import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/project/comment
 * Body: { targetUserId, projectCreatedAt, text }
 * Returns created comment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { targetUserId, projectCreatedAt, text } = body as {
      targetUserId?: string
      projectCreatedAt?: number | string
      text?: string
    }

    if (!targetUserId || projectCreatedAt === undefined || !text?.trim()) {
      return NextResponse.json({ error: 'Missing params or empty text' }, { status: 400 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, image: true, profileSlug: true },
    })
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const ts = typeof projectCreatedAt === 'string' ? BigInt(projectCreatedAt) : BigInt(projectCreatedAt as number)

    const comment = await prisma.projectComment.create({
      data: {
        userId: me.id,
        targetUserId,
        projectCreatedAt: ts,
        text: text.trim(),
      },
    })

    return NextResponse.json({
      ok: true,
      comment: {
        id: comment.id,
        userId: comment.userId,
        text: comment.text,
        createdAt: comment.createdAt,
        user: {
          name: me.name,
          image: me.image,
          profileSlug: me.profileSlug,
        },
      },
    })
  } catch (e) {
    console.error('[project/comment] POST failed:', e)
    return NextResponse.json({ error: '评论失败' }, { status: 500 })
  }
}

/**
 * GET /api/project/comment?targetUserId=xxx&projectCreatedAt=xxx
 * Returns list of comments with user info
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    const projectCreatedAt = searchParams.get('projectCreatedAt')
    if (!targetUserId || !projectCreatedAt) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    const ts = BigInt(projectCreatedAt)

    const comments = await prisma.projectComment.findMany({
      where: { targetUserId, projectCreatedAt: ts },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, image: true, profileSlug: true },
        },
      },
    })

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        userId: c.userId,
        text: c.text,
        createdAt: c.createdAt,
        user: {
          name: c.user.name,
          image: c.user.image,
          profileSlug: c.user.profileSlug,
        },
      })),
    })
  } catch (e) {
    console.error('[project/comment] GET failed:', e)
    return NextResponse.json({ error: '读取失败' }, { status: 500 })
  }
}
