import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 获取用户的公开profile信息（用于分享链接）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    console.log('🔍 [PUBLIC-PROFILE] 获取用户公开信息:', userId)

    // 先按 id 查，再按 profileSlug 查（支持短链接如 /u/cm）
    let user = await withRetry(() => prisma.user.findUnique({
      where: { id: userId },
      include: {
        metadata: true,
        generatedContents: {
          where: { status: 'published' },
          take: 10,
          orderBy: { publishedAt: 'desc' },
          select: {
            id: true,
            title: true,
            storyNarrative: true,
            images: true,
            imageCount: true,
            publishedAt: true
          }
        }
      }
    }))

    if (!user && userId) {
      user = await withRetry(() => prisma.user.findFirst({
        where: { profileSlug: userId },
        include: {
          metadata: true,
          generatedContents: {
            where: { status: 'published' },
            take: 10,
            orderBy: { publishedAt: 'desc' },
            select: {
              id: true,
              title: true,
              storyNarrative: true,
              images: true,
              imageCount: true,
              publishedAt: true
            }
          }
        }
      }))
    }

    // profileSlug 为空时，用 name 匹配（如 name 为 yifan 则 /u/yifan 可访问）
    if (!user && userId && /^[a-zA-Z0-9_-]+$/.test(userId)) {
      const slugLower = userId.toLowerCase()
      const candidates = await withRetry(() => prisma.user.findMany({
        where: { OR: [{ profileSlug: null }, { profileSlug: '' }] },
        take: 200,
        include: {
          metadata: true,
          generatedContents: {
            where: { status: 'published' },
            take: 10,
            orderBy: { publishedAt: 'desc' },
            select: {
              id: true,
              title: true,
              storyNarrative: true,
              images: true,
              imageCount: true,
              publishedAt: true
            }
          }
        }
      }))
      const slugify = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '') || ''
      user = candidates.find((u) => slugify(u.name || '') === slugLower) || null
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 解析JSON字段
    const publishedContents = user.generatedContents.map(content => {
      let images = []
      try {
        if (content.images) {
          images = typeof content.images === 'string'
            ? JSON.parse(content.images)
            : content.images
        }
      } catch (e) {
        console.error('解析图片失败:', e)
      }

      return {
        ...content,
        images
      }
    })

    // 解析 profileData，供公开页展示「仅展示 profile 上的内容：标签、一句话、简介、Q&A、链接等，不包含洞察」
    let profile: {
      oneSentenceDesc?: string | null
      avatarDataUrl?: string | null
      tags?: string[]
      headline?: string | null
      bio?: string | null
      myLink?: string | null
      projects?: { text: string; peopleNeeded: string[] }[] | null
      collaborationPossibility?: string | string[] | null
      peopleToCollaborateWith?: string | string[] | null
      howToEngageMeOnline?: string | null
      howToEngageMeOffline?: string | null
      socialLinks?: Record<string, string>
      customLinks?: { title?: string; url: string }[]
      workIntroductions?: { id: string; cover?: string; name: string; description?: string; url?: string }[]
      experiences?: { id: string; title: string; company: string; employmentType?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }[]
      education?: { id: string; school: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }[]
      qaList?: { question: string; answer: string }[]
    } = {}
    if (user.profileData) {
      try {
        const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
        const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.openingStatement || pd?.whoIAm)?.trim()
        // 标签：只展示用户勾选「在卡片显示」的 selectedTags，未勾选的不显示
        let tags: string[] = []
        if (Array.isArray(pd?.selectedTags) && pd.selectedTags.length > 0) {
          tags = (pd.selectedTags as unknown[]).filter((t: unknown) => typeof t === 'string' && (t as string).trim()) as string[]
        }
        // 感兴趣的话题：公开页展示所有有问题的 Q&A（含未勾选 showInPreview 的），保证「有就显示」
        let qaList: { question: string; answer: string }[] = []
        if (Array.isArray(pd?.qaList)) {
          qaList = (pd.qaList as { question?: string; answer?: string; showInPreview?: boolean }[])
            .filter((qa) => (qa.question ?? '').trim())
            .map((qa) => ({ question: (qa.question ?? '').trim(), answer: (qa.answer ?? '').trim() }))
        }
        profile = {
          oneSentenceDesc: oneLine || null,
          avatarDataUrl: pd?.avatarDataUrl || null,
          tags,
          headline: (pd?.headline || '').trim() || null,
          bio: (pd?.bio && typeof pd.bio === 'string') ? pd.bio.trim() || null : null,
          myLink: (pd?.myLink && typeof pd.myLink === 'string') ? pd.myLink.trim() || null : null,
          projects: (() => {
            const ALLOWED_STAGES = ['Idea', 'Planning']
            const allowedSet = new Set(ALLOWED_STAGES)
            if (Array.isArray(pd?.projects)) {
              return (pd.projects as { text?: string; visibility?: string; showOnPlaza?: boolean; peopleNeeded?: Array<string | { text?: string }>; createdAt?: number; stage?: string; stageOrder?: string[]; stageEnteredAt?: Record<string, number>; creators?: string[] }[])
                .filter((p) => (p.text ?? '').trim() && p.visibility !== 'hidden' && p.showOnPlaza === true)
                .map((p) => {
                  const rawOrder = Array.isArray(p.stageOrder) && p.stageOrder.length > 0
                    ? p.stageOrder.filter((s): s is string => typeof s === 'string' && s.trim()).map((s) => s.trim())
                    : ALLOWED_STAGES
                  const stageOrder = rawOrder.filter((s) => allowedSet.has(s)).length > 0
                    ? rawOrder.filter((s) => allowedSet.has(s))
                    : ALLOWED_STAGES
                  const rawStage = typeof p.stage === 'string' && p.stage.trim() ? p.stage.trim() : undefined
                  const stage = rawStage && allowedSet.has(rawStage) ? rawStage : undefined
                  const rawEntered = p.stageEnteredAt && typeof p.stageEnteredAt === 'object'
                    ? Object.fromEntries(Object.entries(p.stageEnteredAt).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, v as number]))
                    : {}
                  const stageEnteredAt = Object.fromEntries(Object.entries(rawEntered).filter(([k]) => allowedSet.has(k.trim())))
                  const creators = Array.isArray(p.creators)
                    ? p.creators.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).map((c) => c.trim())
                    : []
                  return {
                    text: (p.text ?? '').trim(),
                    createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
                    peopleNeeded: Array.isArray(p.peopleNeeded)
                      ? p.peopleNeeded
                          .map((x) => typeof x === 'string' ? x.trim() : String(x?.text ?? '').trim())
                          .filter(Boolean)
                      : [],
                    stage,
                    stageOrder,
                    stageEnteredAt,
                    creators,
                  }
                })
            }
            return null
          })(),
          collaborationPossibility: (() => {
            const projs = Array.isArray(pd?.projects) ? (pd.projects as { text?: string; visibility?: string; showOnPlaza?: boolean }[]).filter((p) => (p.text ?? '').trim() && p.visibility !== 'hidden' && p.showOnPlaza === true).map((p) => (p.text ?? '').trim()) : null
            if (projs && projs.length > 0) return projs
            if (!Array.isArray(pd?.collaborationPossibility)) return (pd?.collaborationPossibility && typeof pd.collaborationPossibility === 'string') ? pd.collaborationPossibility.trim() || null : null
            return (pd.collaborationPossibility as unknown[])
              .filter((x) => (typeof x === 'string' && (x as string).trim()) || (x && typeof x === 'object' && 'text' in (x as object) && ((x as { isPublic?: boolean }).isPublic !== false)))
              .map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text.trim() : (x as string).trim()))
              .filter(Boolean) as string[] | null
          })(),
          peopleToCollaborateWith: (() => {
            const projs = Array.isArray(pd?.projects)
              ? (pd.projects as { visibility?: string; showOnPlaza?: boolean; peopleNeeded?: Array<string | { text?: string }> }[])
                  .filter((p) => p.visibility !== 'hidden' && p.showOnPlaza === true)
                  .flatMap((p) => (p.peopleNeeded ?? []).map((x) => typeof x === 'string' ? x.trim() : String(x?.text ?? '').trim()).filter(Boolean))
              : null
            if (projs && projs.length > 0) return projs
            if (!Array.isArray(pd?.peopleToCollaborateWith)) return (pd?.peopleToCollaborateWith && typeof pd.peopleToCollaborateWith === 'string') ? pd.peopleToCollaborateWith.trim() || null : null
            return (pd.peopleToCollaborateWith as unknown[])
              .filter((x) => (typeof x === 'string' && (x as string).trim()) || (x && typeof x === 'object' && 'text' in (x as object) && ((x as { isPublic?: boolean }).isPublic !== false)))
              .map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text.trim() : (x as string).trim()))
              .filter(Boolean) as string[] | null
          })(),
          howToEngageMeOnline: (pd?.howToEngageMeOnline && typeof pd.howToEngageMeOnline === 'string') ? pd.howToEngageMeOnline.trim() || null : null,
          howToEngageMeOffline: (pd?.howToEngageMeOffline && typeof pd.howToEngageMeOffline === 'string') ? pd.howToEngageMeOffline.trim() || null : null,
          socialLinks: pd?.socialLinks && typeof pd.socialLinks === 'object' && !Array.isArray(pd.socialLinks) ? pd.socialLinks : undefined,
          customLinks: Array.isArray(pd?.customLinks) ? pd.customLinks.filter((l: unknown) => l && typeof l === 'object' && 'url' in l && typeof (l as { url: string }).url === 'string') : [],
          workIntroductions: Array.isArray(pd?.workIntroductions)
            ? pd.workIntroductions.filter((w: unknown) => w && typeof w === 'object' && 'id' in w && 'name' in w).map((w: { id?: string; cover?: string; name?: string; description?: string; url?: string }) => ({
                id: typeof w.id === 'string' ? w.id : '',
                cover: typeof w.cover === 'string' ? w.cover : undefined,
                name: typeof w.name === 'string' ? w.name : '',
                description: typeof w.description === 'string' ? w.description : undefined,
                url: typeof w.url === 'string' ? w.url : undefined,
              }))
            : undefined,
          experiences: Array.isArray(pd?.experiences)
            ? pd.experiences.filter((x: unknown) => x && typeof x === 'object' && 'id' in x && 'title' in x && 'company' in x).map((x: { id?: string; title?: string; company?: string; employmentType?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }) => ({
                id: typeof x.id === 'string' ? x.id : '',
                title: typeof x.title === 'string' ? x.title : '',
                company: typeof x.company === 'string' ? x.company : '',
                employmentType: typeof x.employmentType === 'string' ? x.employmentType : undefined,
                location: typeof x.location === 'string' ? x.location : undefined,
                startDate: typeof x.startDate === 'string' ? x.startDate : undefined,
                endDate: typeof x.endDate === 'string' ? x.endDate : undefined,
                current: x.current === true,
                description: typeof x.description === 'string' ? x.description : undefined,
              }))
            : undefined,
          education: Array.isArray(pd?.education)
            ? pd.education.filter((x: unknown) => x && typeof x === 'object' && 'id' in x && 'school' in x).map((x: { id?: string; school?: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }) => ({
                id: typeof x.id === 'string' ? x.id : '',
                school: typeof x.school === 'string' ? x.school : '',
                degree: typeof x.degree === 'string' ? x.degree : undefined,
                fieldOfStudy: typeof x.fieldOfStudy === 'string' ? x.fieldOfStudy : undefined,
                startDate: typeof x.startDate === 'string' ? x.startDate : undefined,
                endDate: typeof x.endDate === 'string' ? x.endDate : undefined,
                grade: typeof x.grade === 'string' ? x.grade : undefined,
                description: typeof x.description === 'string' ? x.description : undefined,
              }))
            : undefined,
          qaList: qaList.length > 0 ? qaList : undefined
        }
      } catch (_) {}
    }

    // 返回公开信息（不包含 email 等敏感信息）；含 profile 供展示卡片
    const metadataPayload = user.metadata ? {
      zodiacSign: user.metadata.zodiacSign,
      chineseZodiac: user.metadata.chineseZodiac,
      coreTraits: user.metadata.coreTraits ? JSON.parse(user.metadata.coreTraits) : [],
      communicationStyle: user.metadata.communicationStyle ? JSON.parse(user.metadata.communicationStyle) : [],
      emotionalPattern: user.metadata.emotionalPattern ? JSON.parse(user.metadata.emotionalPattern) : []
    } : null
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        location: user.location,
        createdAt: user.createdAt,
        metadata: metadataPayload
      },
      profile,
      metadata: metadataPayload,
      publishedContents
    })

  } catch (error) {
    console.error('❌ [PUBLIC-PROFILE] 获取用户信息失败:', error)
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    )
  }
}
