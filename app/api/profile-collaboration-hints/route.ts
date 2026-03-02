import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma, { withRetry } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
const profileMessage = 'profileMessage' in prisma ? (prisma as unknown as { profileMessage: any }).profileMessage : undefined

type PotentialItem = {
  targetUserId: string
  targetName?: string
  hint: string
  possibleTopics?: string[]
  viewedAt: string
  source?: 'viewed' | 'engage'
}

function parseEngageMeta(text: string): { contribution?: string; tags?: string[] } | null {
  const line = text
    .split('\n')
    .find((l) => l.startsWith('META:'))
  if (!line) return null
  try {
    const parsed = JSON.parse(line.slice(5)) as { kind?: string; contribution?: string; tags?: string[] }
    if (parsed.kind !== 'square_engage_application') return null
    return {
      contribution: typeof parsed.contribution === 'string' ? parsed.contribution.trim() : undefined,
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 6)
        : [],
    }
  } catch {
    return null
  }
}

/**
 * GET: 获取潜在合作列表
 * - viewed: 我看过谁 + 生成的合作提示
 * - engage: 别人对我在广场项目发起的 Engage 申请
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const viewerUserId = (session?.user as { id?: string })?.id
    if (!viewerUserId) {
      return NextResponse.json({ list: [] })
    }

    let hints: { targetUserId: string; hint: string; updatedAt: Date }[] = []
    try {
      hints = await prisma.collaborationHint.findMany({
      where: { viewerUserId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
    } catch (dbErr: unknown) {
      const code = (dbErr as { code?: string })?.code
      if (code === 'P2021') {
        console.warn('[profile-collaboration-hints] Table collaboration_hints does not exist, run: npx prisma db push')
      }
    }

    const targetIds = Array.from(new Set(hints.map((h) => h.targetUserId)))
    const users = await withRetry(() => prisma.user.findMany({
      where: { OR: [{ id: { in: targetIds } }, { profileSlug: { in: targetIds } }] },
      select: { id: true, name: true, profileSlug: true },
    }))
    const userById = new Map(users.map((u) => [u.id, u]))
    const userBySlug = new Map(users.filter((u) => u.profileSlug).map((u) => [u.profileSlug!, u]))

    const viewedList: PotentialItem[] = hints.map((h) => {
      const target = userById.get(h.targetUserId) ?? userBySlug.get(h.targetUserId)
      const targetName = target?.name ?? null
      const linkId = target?.profileSlug || target?.id || h.targetUserId
      return {
        targetUserId: linkId,
        targetName: targetName ?? undefined,
        hint: h.hint,
        possibleTopics: [] as string[],
        viewedAt: h.updatedAt.toISOString(),
        source: 'viewed',
      }
    })

    let engageList: PotentialItem[] = []
    if (profileMessage) {
      const incoming = await profileMessage.findMany({
        where: {
          toUserId: viewerUserId,
          text: { contains: '[ENGAGE_APPLICATION]' },
        },
        include: {
          fromUser: { select: { id: true, name: true, profileSlug: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      engageList = incoming
        .map((m: any) => {
          const raw = typeof m?.text === 'string' ? m.text : ''
          const meta = parseEngageMeta(raw)
          const contribution = meta?.contribution || ''
          const tags = Array.isArray(meta?.tags) ? meta!.tags! : []
          const fromUser = m?.fromUser
          const targetUserId = fromUser?.profileSlug || fromUser?.id
          if (!targetUserId) return null
          return {
            targetUserId,
            targetName: fromUser?.name || 'Anonymous',
            hint: contribution ? `Wants to contribute: ${contribution}` : 'Sent an engage application.',
            possibleTopics: tags,
            viewedAt: new Date(m.createdAt).toISOString(),
            source: 'engage' as const,
          }
        })
        .filter((x: PotentialItem | null): x is PotentialItem => x !== null)
    }

    const list = [...engageList, ...viewedList]
      .sort((a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime())
      .slice(0, 100)

    return NextResponse.json({ list })
  } catch (e) {
    console.warn('[profile-collaboration-hints]', e)
    return NextResponse.json({ list: [] })
  }
}
