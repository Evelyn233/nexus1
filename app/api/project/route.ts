import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma, withRetry } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/project?userId=xxx&createdAt=123
 * Returns a single project with full detail for the project page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const createdAtStr = searchParams.get('createdAt')
    if (!userId || !createdAtStr) {
      return NextResponse.json({ error: 'Missing userId or createdAt' }, { status: 400 })
    }
    const createdAt = parseInt(createdAtStr, 10)
    if (isNaN(createdAt)) {
      return NextResponse.json({ error: 'Invalid createdAt' }, { status: 400 })
    }

    let user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, image: true, profileSlug: true, profileData: true },
      })
    )
    if (!user && userId) {
      user = await withRetry(() =>
        prisma.user.findFirst({
          where: { profileSlug: userId },
          select: { id: true, name: true, image: true, profileSlug: true, profileData: true },
        })
      )
    }
    if (!user && userId && /^[a-zA-Z0-9_-]+$/.test(userId)) {
      const slugLower = userId.toLowerCase()
      const candidates = await withRetry(() =>
        prisma.user.findMany({
          where: { OR: [{ profileSlug: null }, { profileSlug: '' }] },
          take: 200,
          select: { id: true, name: true, image: true, profileSlug: true, profileData: true },
        })
      )
      const slugify = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '') || ''
      user = candidates.find((u) => slugify(u.name || '') === slugLower) || null
    }

    if (!user?.profileData) {
      return NextResponse.json({ error: 'User or project not found' }, { status: 404 })
    }

    let pd: Record<string, unknown>
    try {
      pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
    } catch {
      return NextResponse.json({ error: 'Invalid profile data' }, { status: 500 })
    }

    const projects = Array.isArray(pd.projects) ? pd.projects : []
    const collab = Array.isArray(pd.collaborationPossibility) ? pd.collaborationPossibility : []
    const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.headline || pd?.openingStatement || pd?.whoIAm) as string | undefined
    const oneSentenceDesc = typeof oneLine === 'string' && oneLine.trim() ? oneLine.trim() : null

    const toNum = (v: unknown): number | null =>
      typeof v === 'number' && !isNaN(v) ? v : (typeof v === 'string' ? (parseInt(v, 10) || null) : null)
    const targetTs = toNum(createdAt)
    const findProjectExact = (arr: unknown[]) =>
      targetTs != null ? arr.find((x: unknown) => {
        const obj = x && typeof x === 'object' ? (x as Record<string, unknown>) : null
        return obj && toNum(obj.createdAt) === targetTs
      }) as Record<string, unknown> | undefined : null
    const findProjectNearest = (arr: unknown[]) => {
      if (targetTs == null || !Array.isArray(arr) || arr.length === 0) return undefined
      let best: Record<string, unknown> | undefined
      let bestDiff = Number.POSITIVE_INFINITY
      for (const x of arr) {
        const obj = x && typeof x === 'object' ? (x as Record<string, unknown>) : null
        if (!obj) continue
        const ts = toNum(obj.createdAt)
        if (ts == null) continue
        const diff = Math.abs(ts - targetTs)
        if (diff < bestDiff) {
          best = obj
          bestDiff = diff
        }
      }
      return best
    }
    let p = findProjectExact(projects)
    if (!p) p = findProjectExact(collab)
    // Fallback: use nearest createdAt when no exact match (links稍微旧一点也能打开)
    if (!p) p = findProjectNearest(projects)
    if (!p) p = findProjectNearest(collab)

    if (!p || !(p.text ?? '').toString().trim()) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const STAGE_RECOMMENDED = ['Idea', 'Planning']
    const text = String(p.text ?? '').trim()
    const detail = typeof p.detail === 'string' ? p.detail.trim() : undefined
    const image = typeof p.image === 'string' && p.image.trim() ? p.image.trim() : typeof p.detailImage === 'string' && p.detailImage.trim() ? p.detailImage.trim() : undefined
    const rawStage = typeof p.stage === 'string' && p.stage.trim() ? p.stage.trim() : undefined
    const rawStageOrder = Array.isArray((p as Record<string, unknown>).stageOrder) && ((p as Record<string, unknown>).stageOrder as unknown[]).length > 0
      ? ((p as Record<string, unknown>).stageOrder as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
      : STAGE_RECOMMENDED
    const stageOrder = rawStageOrder.length > 0 ? rawStageOrder : STAGE_RECOMMENDED
    const stage = rawStage && stageOrder.some((s) => s.toLowerCase() === rawStage.toLowerCase()) ? rawStage : (stageOrder[0] ?? 'Idea')
    const rawStageEnteredAt = (p as Record<string, unknown>).stageEnteredAt && typeof (p as Record<string, unknown>).stageEnteredAt === 'object'
      ? Object.fromEntries(
          Object.entries((p as Record<string, unknown>).stageEnteredAt as Record<string, unknown>)
            .filter(([, v]) => typeof v === 'number')
            .map(([k, v]) => [k, v as number])
        )
      : {}
    const stageEnteredAt = rawStageEnteredAt
    const attachments = Array.isArray(p.attachments)
      ? (p.attachments as { url?: string; name?: string; addedAt?: number; stageTag?: string; contentTag?: string }[])
          .filter((a) => a && typeof a.url === 'string' && a.url.trim())
          .map((a) => ({
            url: (a.url as string).trim(),
            name: typeof a.name === 'string' && a.name.trim() ? a.name.trim() : (a.url as string).trim(),
            addedAt: typeof a.addedAt === 'number' ? a.addedAt : undefined,
            ...(typeof a.stageTag === 'string' && a.stageTag.trim() ? { stageTag: a.stageTag.trim() } : {}),
            ...(typeof a.contentTag === 'string' && a.contentTag.trim() ? { contentTag: a.contentTag.trim() } : {}),
          }))
      : []
    const references = Array.isArray(p.references)
      ? p.references
          .map((r: { url?: string; title?: string; type?: string; cover?: string; description?: string; stageTag?: string; contentTag?: string }) => {
            const url = typeof r?.url === 'string' ? r.url.trim() : ''
            const title = typeof r?.title === 'string' ? r.title.trim() : ''
            const cover = typeof r?.cover === 'string' ? r.cover.trim() : undefined
            const description = typeof r?.description === 'string' ? r.description.trim() : undefined
            const stageTag = typeof r?.stageTag === 'string' && r.stageTag.trim() ? r.stageTag.trim() : undefined
            const contentTag = typeof r?.contentTag === 'string' && r.contentTag.trim() ? r.contentTag.trim() : undefined
            if (!url) return null
            return {
              type: r?.type === 'document' ? ('document' as const) : ('link' as const),
              title: title || 'Link',
              url,
              ...(cover ? { cover } : {}),
              ...(description ? { description } : {}),
              ...(stageTag ? { stageTag } : {}),
              ...(contentTag ? { contentTag } : {}),
            }
          })
          .filter(Boolean)
      : []
    const peopleNeeded = Array.isArray(p.peopleNeeded)
      ? p.peopleNeeded
          .map((x: string | { text?: string; detail?: string; stageTag?: string; contentTag?: string; collabIntent?: string; acceptedSubmissions?: string; recruiterQuestions?: string; image?: string; link?: string; workMode?: string; location?: string }) => {
            if (typeof x === 'string') return x.trim() ? { text: x.trim() } : null
            const obj = x as { text?: string; detail?: string; stageTag?: string; contentTag?: string; collabIntent?: string; acceptedSubmissions?: string; recruiterQuestions?: string; image?: string; link?: string; workMode?: string; location?: string }
            const t = String(obj?.text ?? '').trim()
            if (!t) return null
            const stageTag = typeof obj.stageTag === 'string' && obj.stageTag.trim() ? obj.stageTag.trim() : undefined
            const contentTag = typeof obj.contentTag === 'string' && obj.contentTag.trim() ? obj.contentTag.trim() : undefined
            const collabIntent = typeof obj.collabIntent === 'string' && obj.collabIntent.trim() ? obj.collabIntent.trim() : undefined
            const acceptedSubmissions =
              typeof obj.acceptedSubmissions === 'string' && obj.acceptedSubmissions.trim() ? obj.acceptedSubmissions.trim().slice(0, 500) : undefined
            const recruiterQuestions =
              typeof obj.recruiterQuestions === 'string' && obj.recruiterQuestions.trim()
                ? obj.recruiterQuestions.trim().slice(0, 4000)
                : undefined
            const image = typeof obj.image === 'string' && obj.image.trim() ? obj.image.trim() : undefined
            const link = typeof obj.link === 'string' && obj.link.trim() ? obj.link.trim() : undefined
            const workMode = obj.workMode === 'local' ? 'local' as const : 'remote' as const
            const location = typeof obj.location === 'string' && obj.location.trim() ? obj.location.trim() : undefined
            return {
              text: t,
              detail: typeof obj?.detail === 'string' ? obj.detail.trim() : undefined,
              ...(stageTag ? { stageTag } : {}),
              ...(contentTag ? { contentTag } : {}),
              ...(collabIntent ? { collabIntent } : {}),
              ...(acceptedSubmissions ? { acceptedSubmissions } : {}),
              ...(recruiterQuestions ? { recruiterQuestions } : {}),
              ...(image ? { image } : {}),
              ...(link ? { link } : {}),
              workMode,
              ...(workMode === 'local' && location ? { location } : {}),
            }
          })
          .filter(Boolean)
      : []
    const creators = Array.isArray((p as Record<string, unknown>).creators)
      ? ((p as Record<string, unknown>).creators as unknown[])
          .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
          .map((c) => c.trim())
      : []
    const projectTypeTag = typeof (p as Record<string, unknown>).projectTypeTag === 'string' && (p as Record<string, unknown>).projectTypeTag
      ? String((p as Record<string, unknown>).projectTypeTag).trim().slice(0, 20)
      : undefined
    const openStatusLabel = typeof (p as Record<string, unknown>).openStatusLabel === 'string' && (p as Record<string, unknown>).openStatusLabel
      ? String((p as Record<string, unknown>).openStatusLabel).trim().slice(0, 48)
      : undefined
    const allowEasyApply = (p as Record<string, unknown>).allowEasyApply === true
    const whatToProvide = typeof (p as Record<string, unknown>).whatToProvide === 'string' && (p as Record<string, unknown>).whatToProvide
      ? String((p as Record<string, unknown>).whatToProvide).trim() || undefined
      : undefined
    const whatYouCanBring = typeof (p as Record<string, unknown>).whatYouCanBring === 'string' && (p as Record<string, unknown>).whatYouCanBring
      ? String((p as Record<string, unknown>).whatYouCanBring).trim().slice(0, 1000) || undefined
      : undefined
    const whatYouCanBringTag = typeof (p as Record<string, unknown>).whatYouCanBringTag === 'string' && (p as Record<string, unknown>).whatYouCanBringTag
      ? String((p as Record<string, unknown>).whatYouCanBringTag).trim().slice(0, 60) || undefined
      : undefined
    const cultureAndBenefit = typeof (p as Record<string, unknown>).cultureAndBenefit === 'string' && (p as Record<string, unknown>).cultureAndBenefit
      ? String((p as Record<string, unknown>).cultureAndBenefit).trim().slice(0, 3000) || undefined
      : undefined
    const initiatorRole = typeof (p as Record<string, unknown>).initiatorRole === 'string' && (p as Record<string, unknown>).initiatorRole
      ? String((p as Record<string, unknown>).initiatorRole).trim().slice(0, 64) || undefined
      : undefined
    const projectOneSentence = typeof (p as Record<string, unknown>).oneSentenceDesc === 'string' && (p as Record<string, unknown>).oneSentenceDesc
      ? String((p as Record<string, unknown>).oneSentenceDesc).trim().slice(0, 500) || undefined
      : undefined
    const visibility = (p as Record<string, unknown>).visibility === 'hidden' ? 'hidden' as const
      : (p as Record<string, unknown>).visibility === 'public' ? 'public' as const
      : 'individual' as const
    const showOnPlaza = (p as Record<string, unknown>).showOnPlaza === true

    const slug = user.profileSlug?.trim() || (user.name || '').toLowerCase().replace(/\s+/g, '') || user.id
    const avatarDataUrl = (typeof pd.avatarDataUrl === 'string' && (pd.avatarDataUrl as string).trim())
      ? (pd.avatarDataUrl as string).trim()
      : (typeof user.image === 'string' && user.image.trim() ? user.image : null)

    return NextResponse.json({
      success: true,
      project: {
        text,
        detail,
        image,
        stage,
        stageOrder,
        stageEnteredAt,
        references,
        peopleNeeded,
        attachments,
        creators,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : createdAt,
        projectTypeTag,
        openStatusLabel,
        allowEasyApply,
        whatToProvide,
        whatYouCanBring,
        whatYouCanBringTag,
        cultureAndBenefit,
        initiatorRole,
        oneSentenceDesc: projectOneSentence,
        visibility,
        showOnPlaza,
      },
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        profileSlug: slug,
        oneSentenceDesc,
        avatarDataUrl,
      },
    })
  } catch (e) {
    console.error('[project]', e)
    return NextResponse.json({ error: 'Failed to load project' }, { status: 500 })
  }
}

/**
 * PATCH /api/project?userId=xxx&createdAt=123
 * Update a project. Requires auth; must be the project owner.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const createdAtStr = searchParams.get('createdAt')
    if (!userId || !createdAtStr) {
      return NextResponse.json({ error: 'Missing userId or createdAt' }, { status: 400 })
    }
    const createdAt = parseInt(createdAtStr, 10)
    if (isNaN(createdAt)) {
      return NextResponse.json({ error: 'Invalid createdAt' }, { status: 400 })
    }

    const me = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: session.user!.email! },
        select: { id: true },
      })
    )
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, profileData: true },
      })
    )
    if (!user && userId) {
      user = await withRetry(() =>
        prisma.user.findFirst({
          where: { profileSlug: userId },
          select: { id: true, profileData: true },
        })
      )
    }
    if (!user || user.id !== me.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    let pd: Record<string, unknown>
    try {
      pd = user.profileData ? (JSON.parse(user.profileData) as Record<string, unknown>) : {}
    } catch {
      return NextResponse.json({ error: 'Invalid profile data' }, { status: 500 })
    }

    const projects = Array.isArray(pd.projects) ? [...(pd.projects as Record<string, unknown>[])] : []
    const idx = projects.findIndex((p) => (p as { createdAt?: number }).createdAt === createdAt)
    if (idx < 0) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const p = projects[idx] as Record<string, unknown>
    if (typeof body.text === 'string' && body.text.trim()) p.text = body.text.trim()
    if (typeof body.detail === 'string') p.detail = body.detail.trim() || undefined
    if (typeof body.stage === 'string' && body.stage.trim()) p.stage = body.stage.trim()
    if (Array.isArray(body.stageOrder)) p.stageOrder = body.stageOrder.filter((s: unknown) => typeof s === 'string' && s.trim())
    if (typeof body.stageEnteredAt === 'object' && body.stageEnteredAt) p.stageEnteredAt = body.stageEnteredAt
    if (Array.isArray(body.peopleNeeded)) p.peopleNeeded = body.peopleNeeded
    if (Array.isArray(body.references)) p.references = body.references
    if (Array.isArray(body.attachments)) p.attachments = body.attachments
    if (Array.isArray(body.creators)) p.creators = body.creators
    if (typeof body.projectTypeTag === 'string') p.projectTypeTag = body.projectTypeTag.trim().slice(0, 20) || undefined
    if (typeof body.openStatusLabel === 'string') p.openStatusLabel = body.openStatusLabel.trim().slice(0, 48) || undefined
    if (typeof body.allowEasyApply === 'boolean') p.allowEasyApply = body.allowEasyApply
    if (typeof body.whatToProvide === 'string') p.whatToProvide = body.whatToProvide.trim().slice(0, 2000) || undefined
    if (typeof body.whatYouCanBring === 'string') p.whatYouCanBring = body.whatYouCanBring.trim().slice(0, 1000) || undefined
    if (typeof body.whatYouCanBringTag === 'string') p.whatYouCanBringTag = body.whatYouCanBringTag.trim().slice(0, 60) || undefined
    if (typeof body.cultureAndBenefit === 'string') p.cultureAndBenefit = body.cultureAndBenefit.trim().slice(0, 3000) || undefined
    if (typeof body.initiatorRole === 'string') p.initiatorRole = body.initiatorRole.trim().slice(0, 64) || undefined
    if (typeof body.oneSentenceDesc === 'string') p.oneSentenceDesc = body.oneSentenceDesc.trim().slice(0, 500) || undefined
    if (typeof body.detailImage === 'string') p.detailImage = body.detailImage.trim() || undefined
    if (body.visibility === 'public' || body.visibility === 'hidden' || body.visibility === 'individual') p.visibility = body.visibility
    if (typeof body.showOnPlaza === 'boolean') p.showOnPlaza = body.showOnPlaza

    await withRetry(() =>
      prisma.user.update({
        where: { id: user.id },
        data: { profileData: JSON.stringify({ ...pd, projects }) },
      })
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[project PATCH]', e)
    const raw = e instanceof Error ? e.message : String(e)
    // 不要把 Prisma 引擎/连接错误的原始信息（含 backtrace）直接给用户看
    const message =
      raw.includes('Engine is not yet connected') || raw.includes('napi_register_module')
        ? '数据库正在连接，请稍后重试'
        : raw.slice(0, 200)
    return NextResponse.json({ error: message || 'Update failed' }, { status: 500 })
  }
}
