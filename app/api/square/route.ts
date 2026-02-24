import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma, withRetry } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type PeopleNeededItem = { text: string; detail?: string }
type InteractionComment = { id: string; userId: string; userName?: string; text: string; createdAt: number }
type ProjectInteractions = { likes: string[]; favorites: string[]; comments: InteractionComment[] }
type Project = { text?: string; visibility?: string; showOnPlaza?: boolean; peopleNeeded?: Array<string | { text?: string; detail?: string }>; createdAt?: number }

type FeedItem = {
  userId: string
  userName: string | null
  profileSlug: string | null
  oneSentenceDesc: string | null
  project: {
    text: string
    peopleNeeded: PeopleNeededItem[]
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
  const likes = Array.isArray(obj.likes) ? obj.likes.filter((x): x is string => typeof x === 'string' && x.trim()) : []
  const favorites = Array.isArray(obj.favorites) ? obj.favorites.filter((x): x is string => typeof x === 'string' && x.trim()) : []
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
          return { id, userId, userName, text, createdAt }
        })
        .filter((v): v is InteractionComment => !!v)
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
          if (text && p.showOnPlaza === true) {
            const createdAt = typeof p.createdAt === 'number' ? p.createdAt : Date.now()
            const interactions = normalizeInteractions((p as Record<string, unknown>).interactions)
            flatItems.push({
              ...userInfo,
              project: {
                text,
                peopleNeeded: Array.isArray(p.peopleNeeded)
                  ? p.peopleNeeded
                      .map((item) => {
                        if (typeof item === 'string') {
                          const text = item.trim()
                          return text ? { text } : null
                        }
                        if (item && typeof item === 'object') {
                          const text = String(item.text ?? '').trim()
                          const detail = typeof item.detail === 'string' ? item.detail.trim() : ''
                          return text ? { text, detail: detail || undefined } : null
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
