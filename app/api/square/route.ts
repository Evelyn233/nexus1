import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma, withRetry } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
  openStatusLabel?: string
}

/**
 * Plaza Item: 以 Look For (peopleNeeded) 为单位，每个 Look For 单独一个条目
 * Project 信息作为上下文背景
 */
type PlazaItem = {
  userId: string
  userName: string | null
  profileSlug: string | null
  oneSentenceDesc: string | null
  avatarDataUrl?: string | null
  /** Look For 信息 - 这是 Plaza 的核心主体 */
  lookFor: {
    text: string
    detail?: string
    stageTag?: string
    contentTag?: string
    collabIntent?: string
    collabIntentLabel?: string
    image?: string
    workMode?: 'local' | 'remote'
    location?: string
  }
  /** Project 信息 - 作为背景/上下文 */
  project: {
    text: string
    image?: string
    detail?: string
    references?: Array<{ type: 'link' | 'document'; title: string; url: string }>
    stage?: string
    stageOrder?: string[]
    createdAt: number
    openStatusLabel?: string
    projectTypeTag?: string
    whatToProvide?: string
    allowEasyApply?: boolean
  }
  /** 该 Look For 所在的 Project createdAt，用于链接 */
  projectCreatedAt: number
  interaction: {
    likeCount: number
    favoriteCount: number
    commentCount: number
    myLiked: boolean
    myFavorited: boolean
    comments: InteractionComment[]
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
 * 扁平化 peopleNeeded，提取单个 Look For 条目
 */
function extractPeopleNeeded(item: string | { text?: string; detail?: string; stageTag?: string; contentTag?: string; collabIntent?: string; image?: string; workMode?: 'local' | 'remote'; location?: string } | null | undefined, collabIntentOptions: { value: string; label: string }[]): PlazaItem['lookFor'] | null {
  if (!item) return null
  if (typeof item === 'string') {
    const text = item.trim()
    return text ? { text } : null
  }
  const o = item as Record<string, unknown>
  const text = String(o.text ?? '').trim()
  if (!text) return null
  const detail = typeof o.detail === 'string' ? o.detail.trim() : ''
  const stageTag = typeof o.stageTag === 'string' && o.stageTag.trim() ? o.stageTag.trim() : undefined
  const contentTag = typeof o.contentTag === 'string' && o.contentTag.trim() ? o.contentTag.trim() : undefined
  const collabIntent = typeof o.collabIntent === 'string' && o.collabIntent.trim() ? o.collabIntent.trim() : undefined
  const image = typeof o.image === 'string' && o.image.trim() ? o.image.trim() : undefined
  const workMode = o.workMode === 'local' ? 'local' as const : o.workMode === 'remote' ? 'remote' as const : undefined
  const location = typeof o.location === 'string' && o.location.trim() ? o.location.trim() : undefined
  let collabIntentLabel: string | undefined
  if (collabIntent) {
    const found = collabIntentOptions.find((opt) => opt.value === collabIntent)
    if (found) collabIntentLabel = found.label
    else if (collabIntent === 'guest') collabIntentLabel = '嘉宾'
    else if (collabIntent === 'partner') collabIntentLabel = '合作伙伴'
    else if (collabIntent === 'part-time') collabIntentLabel = '纯兼职'
  }
  return {
    text,
    ...(detail ? { detail } : {}),
    ...(stageTag ? { stageTag } : {}),
    ...(contentTag ? { contentTag } : {}),
    ...(collabIntent ? { collabIntent } : {}),
    ...(collabIntentLabel ? { collabIntentLabel } : {}),
    ...(image ? { image } : {}),
    ...(workMode ? { workMode } : {}),
    ...(workMode === 'local' && location ? { location } : {}),
  }
}

/**
 * GET: Plaza - 以 Look For 为单位，每个 peopleNeeded 条目单独一个 PlazaItem
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
        select: { id: true, name: true, profileSlug: true, profileData: true, image: true },
        take: 500,
      })
    )

    const plazaItems: PlazaItem[] = []

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
      const fromProfile = (typeof pd?.avatarDataUrl === 'string' && pd.avatarDataUrl.trim()) ? pd.avatarDataUrl.trim() : null
      const avatarDataUrl = fromProfile || (typeof user.image === 'string' && user.image.trim() ? user.image.trim() : null)
      const userInfo = { userId: user.id, userName: user.name, profileSlug: user.profileSlug, oneSentenceDesc, avatarDataUrl }
      const collabIntentOptions = Array.isArray((pd as { collabIntentOptions?: { value?: string; label?: string }[] }).collabIntentOptions)
        ? ((pd as { collabIntentOptions: { value?: string; label?: string }[] }).collabIntentOptions)
            .filter((o) => typeof o?.value === 'string' && o.value.trim())
            .map((o) => ({ value: o.value!.trim(), label: typeof o.label === 'string' && o.label.trim() ? o.label.trim() : o.value!.trim() }))
        : []

      if (Array.isArray(pd.projects)) {
        for (const p of pd.projects as Project[]) {
          const projectText = (p.text ?? '').trim()
          const projectImage = typeof p.image === 'string' && p.image.trim() ? p.image.trim() : undefined
          const projectDetail = typeof p.detail === 'string' && p.detail.trim() ? p.detail.trim() : undefined
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

          // 获取 Project 的 createdAt
          const rawCreatedAt = (p as Record<string, unknown>).createdAt
          const projectCreatedAt =
            typeof rawCreatedAt === 'number' && !Number.isNaN(rawCreatedAt)
              ? rawCreatedAt
              : typeof rawCreatedAt === 'string'
                ? (() => {
                    const parsed = parseInt(rawCreatedAt, 10)
                    return Number.isNaN(parsed) ? Date.now() : parsed
                  })()
                : Date.now()

          const interactions = normalizeInteractions((p as Record<string, unknown>).interactions)
          const stage = typeof (p as Record<string, unknown>).stage === 'string' && String((p as Record<string, unknown>).stage).trim()
            ? String((p as Record<string, unknown>).stage).trim()
            : undefined
          const stageOrder = Array.isArray((p as Record<string, unknown>).stageOrder)
            ? ((p as Record<string, unknown>).stageOrder as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
            : undefined
          const openStatusLabel = typeof (p as Record<string, unknown>).openStatusLabel === 'string' && String((p as Record<string, unknown>).openStatusLabel).trim()
            ? String((p as Record<string, unknown>).openStatusLabel).trim().slice(0, 48)
            : undefined
          const projectTypeTags = Array.isArray((p as Record<string, unknown>).projectTypeTags)
            ? ((p as Record<string, unknown>).projectTypeTags as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t: string) => t.trim()).slice(0, 10)
            : (typeof (p as Record<string, unknown>).projectTypeTag === 'string' && ((p as Record<string, unknown>).projectTypeTag as string).trim().length > 0
                ? [String((p as Record<string, unknown>).projectTypeTag).trim().slice(0, 24)]
                : [])
          const allowEasyApply = (p as Record<string, unknown>).allowEasyApply === true
          const whatToProvide = typeof (p as Record<string, unknown>).whatToProvide === 'string' && String((p as Record<string, unknown>).whatToProvide).trim()
            ? String((p as Record<string, unknown>).whatToProvide).trim().slice(0, 300)
            : undefined

          // 获取 peopleNeeded 条目
          const peopleNeededList = Array.isArray(p.peopleNeeded)
            ? p.peopleNeeded.map((item) => extractPeopleNeeded(item, collabIntentOptions)).filter((v): v is PlazaItem['lookFor'] => !!v)
            : []

          // 扁平化：每个 Look For 条目单独作为一个 PlazaItem
          // 必须有项目基本信息 + 至少一个 Look For 才能上 Plaza
          if ((projectText || projectImage) && peopleNeededList.length > 0 && p.showOnPlaza === true && (p as Record<string, unknown>).visibility !== 'hidden') {
            for (const lookFor of peopleNeededList) {
              plazaItems.push({
                ...userInfo,
                lookFor,
                project: {
                  text: projectText,
                  ...(projectImage ? { image: projectImage } : {}),
                  ...(projectDetail ? { detail: projectDetail } : {}),
                  ...(references && references.length > 0 ? { references } : {}),
                  ...(stage ? { stage } : {}),
                  ...(stageOrder && stageOrder.length > 0 ? { stageOrder } : {}),
                  createdAt: projectCreatedAt,
                  ...(openStatusLabel ? { openStatusLabel } : {}),
                  ...(projectTypeTags.length > 0 ? { projectTypeTags } : {}),
                  ...(whatToProvide ? { whatToProvide } : {}),
                  ...(allowEasyApply ? { allowEasyApply: true } : {}),
                },
                projectCreatedAt,
                interaction: {
                  likeCount: interactions.likes.length,
                  favoriteCount: interactions.favorites.length,
                  commentCount: interactions.comments.length,
                  myLiked: !!viewerUserId && interactions.likes.includes(viewerUserId),
                  myFavorited: !!viewerUserId && interactions.favorites.includes(viewerUserId),
                  comments: interactions.comments.slice(-5),
                },
              })
            }
          }
        }
      } else {
        // Legacy: collaborationPossibility + peopleToCollaborateWith
        const need = Array.isArray(pd.peopleToCollaborateWith)
          ? (pd.peopleToCollaborateWith as unknown[]).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text : String(x))).filter(Boolean)
          : []
        const doing = Array.isArray(pd.collaborationPossibility)
          ? (pd.collaborationPossibility as unknown[]).filter((x) => (typeof x === 'string' && (x as string).trim()) || (x && typeof x === 'object' && 'text' in (x as object) && ((x as { isPublic?: boolean }).isPublic !== false))).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text.trim() : (x as string).trim())).filter(Boolean)
          : []
        const projectText = doing[0] || 'Project'
        if (need.length > 0) {
          for (const lookForText of need) {
            plazaItems.push({
              ...userInfo,
              lookFor: { text: lookForText },
              project: {
                text: projectText,
                createdAt: Date.now(),
              },
              projectCreatedAt: Date.now(),
              interaction: { likeCount: 0, favoriteCount: 0, commentCount: 0, myLiked: false, myFavorited: false, comments: [] },
            })
          }
        }
      }
    }

    plazaItems.sort((a, b) => b.project.createdAt - a.project.createdAt)

    return NextResponse.json({ items: plazaItems })
  } catch (e) {
    console.error('[square]', e)
    return NextResponse.json({ error: 'Failed to load square' }, { status: 500 })
  }
}
