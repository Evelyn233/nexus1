import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET: 获取当前用户（访客）看过的潜在合作列表，从数据库读取
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const viewerUserId = (session?.user as { id?: string })?.id
    if (!viewerUserId) {
      return NextResponse.json({ list: [] })
    }

    const hints = await prisma.collaborationHint.findMany({
      where: { viewerUserId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    const targetIds = [...new Set(hints.map((h) => h.targetUserId))]
    const users = await prisma.user.findMany({
      where: { OR: [{ id: { in: targetIds } }, { profileSlug: { in: targetIds } }] },
      select: { id: true, name: true, profileSlug: true },
    })
    const userById = new Map(users.map((u) => [u.id, u]))
    const userBySlug = new Map(users.filter((u) => u.profileSlug).map((u) => [u.profileSlug!, u]))

    const list = hints.map((h) => {
      const target = userById.get(h.targetUserId) ?? userBySlug.get(h.targetUserId)
      const targetName = target?.name ?? null
      const linkId = target?.profileSlug || target?.id || h.targetUserId
      return {
        targetUserId: linkId,
        targetName: targetName ?? undefined,
        hint: h.hint,
        possibleTopics: [] as string[],
        viewedAt: h.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ list })
  } catch (e) {
    console.warn('[profile-collaboration-hints]', e)
    return NextResponse.json({ list: [] })
  }
}
