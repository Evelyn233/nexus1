import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma, withRetry } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type PeopleNeededItem = { text: string; detail?: string; stageTag?: string; contentTag?: string }
type InteractionComment = { id: string; userId: string; userName?: string; text: string; createdAt: number }
type ProjectInteractions = { likes: string[]; favorites: string[]; comments: InteractionComment[] }
type Project = {
  text?: string
  image?: string
  detail?: string
  references?: Array<{ type?: string; title?: string; url?: string }>
  visibility?: string
  showOnPlaza?: boolean
  peopleNeeded?: Array<string | { text?: string; detail?: string }>
  stage?: string
  createdAt?: number
}

type FeedItem = {
  userId: string
  userName: string | null
  profileSlug: string | null
  oneSentenceDesc: string | null
  project: {
    text: string
    image?: string
    detail?: string
    references?: Array<{ type: 'link' | 'document'; title: string; url: string }>
    peopleNeeded: PeopleNeededItem[]
    stage?: string
    stageOrder?: string[]
    stageEnteredAt?: Record<string, number>
    createdAt: number
    interaction: {
      likeCount: number
      favoriteCount: number
      commentCount: number
      myLiked: boolean
      myFavorited: boolean
      comments: InteractionComment[]
    }
  }
}

function normalizeInteractions(raw: unknown): ProjectInteractions {
  const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const likes = Array.isArray(obj.likes) ? obj.likes.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
  const favorites = Array.isArray(obj.favorites) ? obj.favorites.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
  const comments = Array.isArray(obj.comments)
    ? obj.comments
        .map((c) => {
          if (!c || typeof c !== 'object') return null
          const it = c as Record<string, unknown>
          const id = typeof it.id === 'string' ? it.id : ''
          const userId = typeof it.userId === 'string' ? it.userId : ''
          const text = typeof it.text === 'string' ? it.text.trim() : ''
          const createdAt = typeof it.createdAt === 'number' ? it.createdAt : Date.now()
          const userName = typeof it.userName === 'string' ? it.userName : undefined
          if (!id || !userId || !text) return null
          const normalized: InteractionComment = {
            id,
            userId,
            text,
            createdAt,
            ...(userName ? { userName } : {}),
          }
          return normalized
        })
        .filter((v): v is InteractionComment => v !== null)
    : []
  comments.sort((a, b) => a.createdAt - b.createdAt)
  return { likes, favorites, comments }
}

/**
 * GET: Plaza - fetch all users' public projects, flattened by project with createdAt, sorted by time
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    let viewerUserId: string | null = null
    if (session?.user?.email) {
      const me = await withRetry(() =>
        prisma.user.findUnique({
          where: { email: session.user!.email! },
          select: { id: true },
        })
      )
      viewerUserId = me?.id ?? null
    }

    const users = await withRetry(() =>
      prisma.user.findMany({
        where: { profileData: { not: null } },
        select: { id: true, name: true, profileSlug: true, profileData: true },
        take: 500,
      })
    )

    const flatItems: FeedItem[] = []

    for (const user of users) {
      if (!user.profileData) continue
      let pd: Record<string, unknown>
      try {
        pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
      } catch {
        continue
      }

      const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.headline || pd?.openingStatement || pd?.whoIAm) as string | undefined
      const oneSentenceDesc = typeof oneLine === 'string' && oneLine.trim() ? oneLine.trim() : null
      const userInfo = { userId: user.id, userName: user.name, profileSlug: user.profileSlug, oneSentenceDesc }

      if (Array.isArray(pd.projects)) {
        for (const p of pd.projects as Project[]) {
          const text = (p.text ?? '').trim()
          const image = typeof p.image === 'string' && p.image.trim() ? p.image.trim() : undefined
          const detail = typeof p.detail === 'string' && p.detail.trim() ? p.detail.trim() : undefined
          const references = Array.isArray(p.references)
            ? p.references
                .map((r) => {
                  const url = typeof r?.url === 'string' ? r.url.trim() : ''
                  const title = typeof r?.title === 'string' ? r.title.trim() : ''
                  if (!url) return null
                  return {
                    type: r?.type === 'document' ? 'document' as const : 'link' as const,
                    title: title || (r?.type === 'document' ? 'Document' : 'Link'),
                    url,
                  }
                })
                .filter((v): v is { type: 'link' | 'document'; title: string; url: string } => !!v)
            : undefined
          if ((text || image) && p.showOnPlaza === true && (p as Record<string, unknown>).visibility !== 'hidden') {
            const createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now()
            const interactions = normalizeInteractions((p as Record<string, unknown>).interactions)
            const stage = typeof (p as Record<string, unknown>).stage === 'string' && String((p as Record<string, unknown>).stage).trim()
              ? String((p as Record<string, unknown>).stage).trim()
              : undefined
            const stageOrder = Array.isArray((p as Record<string, unknown>).stageOrder)
              ? ((p as Record<string, unknown>).stageOrder as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
              : undefined
            const rawStageEnteredAt = (p as Record<string, unknown>).stageEnteredAt
            const stageEnteredAt: Record<string, number> | undefined =
              rawStageEnteredAt && typeof rawStageEnteredAt === 'object'
                ? Object.fromEntries(
                    Object.entries(rawStageEnteredAt as Record<string, unknown>)
                      .filter(([, v]): v is number => typeof v === 'number')
                      .map(([k, v]) => [k, v])
                  )
                : undefined
            const hasStageEnteredAt = stageEnteredAt && Object.keys(stageEnteredAt).length > 0

            flatItems.push({
              ...userInfo,
              project: {
                text,
                image,
                detail,
                references,
                ...(stage ? { stage } : {}),
                ...(stageOrder && stageOrder.length > 0 ? { stageOrder } : {}),
                ...(hasStageEnteredAt ? { stageEnteredAt } : {}),
                peopleNeeded: Array.isArray(p.peopleNeeded)
                  ? p.peopleNeeded
                      .map((item) => {
                        if (typeof item === 'string') {
                          const text = item.trim()
                          return text ? { text } : null
                        }
                        if (item && typeof item === 'object') {
                          const o = item as Record<string, unknown>
                          const text = String(o.text ?? '').trim()
                          const detail = typeof o.detail === 'string' ? o.detail.trim() : ''
                          const stageTag = typeof o.stageTag === 'string' && o.stageTag.trim() ? o.stageTag.trim() : undefined
                          const contentTag = typeof o.contentTag === 'string' && o.contentTag.trim() ? o.contentTag.trim() : undefined
                          return text ? { text, detail: detail || undefined, stageTag, contentTag } : null
                        }
                        return null
                      })
                      .filter((v): v is PeopleNeededItem => !!v)
                  : [],
                createdAt,
                interaction: {
                  likeCount: interactions.likes.length,
                  favoriteCount: interactions.favorites.length,
                  commentCount: interactions.comments.length,
                  myLiked: !!viewerUserId && interactions.likes.includes(viewerUserId),
                  myFavorited: !!viewerUserId && interactions.favorites.includes(viewerUserId),
                  comments: interactions.comments.slice(-5),
                },
              },
            })
          }
        }
      } else {
        // Legacy: collaborationPossibility + peopleToCollaborateWith
        const doing = Array.isArray(pd.collaborationPossibility)
          ? (pd.collaborationPossibility as unknown[]).filter((x) => (typeof x === 'string' && (x as string).trim()) || (x && typeof x === 'object' && 'text' in (x as object) && ((x as { isPublic?: boolean }).isPublic !== false))).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text.trim() : (x as string).trim())).filter(Boolean)
          : []
        const need = Array.isArray(pd.peopleToCollaborateWith)
          ? (pd.peopleToCollaborateWith as unknown[]).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text : String(x))).filter(Boolean)
          : []
        if (doing.length > 0) {
          flatItems.push({
            ...userInfo,
            project: {
              text: doing[0],
              peopleNeeded: (need as string[]).map((x) => ({ text: x })),
              createdAt: Date.now(),
              interaction: { likeCount: 0, favoriteCount: 0, commentCount: 0, myLiked: false, myFavorited: false, comments: [] },
            },
          })
        }
        doing.slice(1).forEach((t) =>
          flatItems.push({
            ...userInfo,
            project: {
              text: t,
              peopleNeeded: [],
              createdAt: Date.now(),
              interaction: { likeCount: 0, favoriteCount: 0, commentCount: 0, myLiked: false, myFavorited: false, comments: [] },
            },
          })
        )
      }
    }

    flatItems.sort((a, b) => b.project.createdAt - a.project.createdAt)

    return NextResponse.json({ items: flatItems })
  } catch (e) {
    console.error('[square]', e)
    return NextResponse.json({ error: 'Failed to load square' }, { status: 500 })
  }
}
