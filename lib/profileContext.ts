import prisma, { withRetry } from '@/lib/prisma'

/**
 * 获取「公开页」同款档案数据，与 /api/user/[userId] 的 profile 完全一致
 */
export async function getProfileContext(ownerId: string | null): Promise<string> {
  return getProfileContextInternal(ownerId, false)
}

/**
 * 获取「完整档案」：含 User 表 + profileData + metadata + 每日一问，用于潜在合作生成
 * 数据源：User 表（name/location/personality/selfInterests/selfGoals）、profileData JSON、UserMetadata、UserDailyQuestionResponse
 */
export async function getFullProfileContext(ownerId: string | null): Promise<string> {
  return getProfileContextInternal(ownerId, true)
}

async function getProfileContextInternal(ownerId: string | null, full: boolean): Promise<string> {
  if (!ownerId || !String(ownerId).trim()) return '暂无公开档案。'

  const idOrSlug = String(ownerId).trim()
  const baseSelect = { id: true, name: true, location: true, profileData: true, personality: true, selfInterests: true, selfGoals: true } as const
  let user = await withRetry(() =>
    prisma.user.findUnique({
      where: { id: idOrSlug },
      select: full ? { ...baseSelect, metadata: { select: { coreTraits: true } } } : baseSelect,
    })
  )
  if (!user) {
    user = await withRetry(() =>
      prisma.user.findFirst({
        where: { profileSlug: idOrSlug },
        select: full ? { ...baseSelect, metadata: { select: { coreTraits: true } } } : baseSelect,
      })
    )
  }
  if (!user && /^[a-zA-Z0-9_-]+$/.test(idOrSlug)) {
    const slugLower = idOrSlug.toLowerCase()
    const slugify = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '') || ''
    const candidates = await withRetry(() => prisma.user.findMany({
      where: { OR: [{ profileSlug: null }, { profileSlug: '' }] },
      take: 200,
      select: full ? { ...baseSelect, metadata: { select: { coreTraits: true } } } : baseSelect,
    }))
    user = candidates.find((u) => slugify(u.name || '') === slugLower) || null
  }
  if (!user) return '暂无公开档案。'

  const parts: string[] = []
  // User 表基础字段
  if (user.name) parts.push(`姓名：${user.name}`)
  if (user.location) parts.push(`所在地：${user.location}`)
  if (full && (user as { personality?: string }).personality?.trim()) {
    parts.push(`【性格/自我认知】${(user as { personality: string }).personality.trim()}`)
  }
  if (full && (user as { selfInterests?: string }).selfInterests?.trim()) {
    parts.push(`【兴趣】${(user as { selfInterests: string }).selfInterests.trim()}`)
  }
  if (full && (user as { selfGoals?: string }).selfGoals?.trim()) {
    parts.push(`【目标】${(user as { selfGoals: string }).selfGoals.trim()}`)
  }
  if (!user.profileData) {
    if (full && user.metadata) {
      const meta = user.metadata as { coreTraits?: string; communicationStyle?: string } | null
      if (meta?.coreTraits) parts.push(`特质：${meta.coreTraits}`)
    }
    return parts.length ? parts.join('\n') : '暂无更多公开信息。'
  }

  try {
    const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
    const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.openingStatement || pd?.whoIAm)?.trim()
    if (oneLine) parts.push(`【一句话自我介绍】${oneLine}`)
    const collabWhatArr: string[] = []
    const collabWhoArr: string[] = []
    if (Array.isArray(pd?.projects)) {
      for (const p of pd.projects as { text?: string; visibility?: string; peopleNeeded?: string[] }[]) {
        const t = (p.text ?? '').trim()
        if (t) collabWhatArr.push(t)
        if (Array.isArray(p.peopleNeeded)) collabWhoArr.push(...p.peopleNeeded.filter((s): s is string => typeof s === 'string' && s.trim()))
      }
    } else {
      const oldWhat = Array.isArray(pd?.collaborationPossibility)
        ? (pd.collaborationPossibility as unknown[]).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text : String(x))).filter(Boolean)
        : (pd?.collaborationPossibility && typeof pd.collaborationPossibility === 'string' ? pd.collaborationPossibility.trim() : '') ? [pd.collaborationPossibility as string] : []
      collabWhatArr.push(...oldWhat)
      const oldWho = Array.isArray(pd?.peopleToCollaborateWith)
        ? (pd.peopleToCollaborateWith as unknown[]).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text : String(x))).filter(Boolean)
        : (pd?.peopleToCollaborateWith && typeof pd.peopleToCollaborateWith === 'string' ? pd.peopleToCollaborateWith.trim() : '') ? [pd.peopleToCollaborateWith as string] : []
      collabWhoArr.push(...oldWho)
    }
    const collabWhat = collabWhatArr.join('；')
    if (collabWhat) parts.push(`【合作可能】${collabWhat}`)
    const collabWho = collabWhoArr.join('；')
    if (collabWho) parts.push(`【想要合作的人】${collabWho}`)
    if (pd?.howToEngageMeOnline && typeof pd.howToEngageMeOnline === 'string' && pd.howToEngageMeOnline.trim()) {
      parts.push(`【How to engage 线上】${pd.howToEngageMeOnline.trim()}`)
    }
    if (pd?.howToEngageMeOffline && typeof pd.howToEngageMeOffline === 'string' && pd.howToEngageMeOffline.trim()) {
      parts.push(`【How to engage 线下】${pd.howToEngageMeOffline.trim()}`)
    }
    if (pd?.headline && (pd.headline as string).trim() && pd.headline !== oneLine) {
      parts.push(`简介：${(pd.headline as string).trim()}`)
    }
    if (pd?.bio && typeof pd.bio === 'string' && pd.bio.trim()) {
      parts.push(`简介详情：${pd.bio.trim().slice(0, 500)}`)
    }
    const selectedTags = Array.isArray(pd?.selectedTags)
      ? (pd.selectedTags as unknown[]).filter((t: unknown) => typeof t === 'string' && (t as string).trim()) as string[]
      : []
    const tags = Array.isArray(pd?.tags) ? (pd.tags as string[]).filter(Boolean) : []
    const allTags = selectedTags.length ? selectedTags : tags
    if (allTags.length > 0) parts.push(`【标签】${allTags.join('、')}`)
    if (Array.isArray(pd?.insights) && (pd.insights as string[]).length > 0) {
      parts.push(`【洞察】${(pd.insights as string[]).slice(0, 8).join('、')}`)
    }
    if (Array.isArray(pd?.qaList) && pd.qaList.length > 0) {
      parts.push('\n【感兴趣的话题 Q&A】')
      for (const qa of pd.qaList as { question?: string; answer?: string }[]) {
        const q = (qa.question ?? '').trim()
        if (q) parts.push(`Q: ${q}\nA: ${(qa.answer ?? '').trim() || '(未填)'}`)
      }
    }
    if (pd?.socialLinks && typeof pd.socialLinks === 'object' && !Array.isArray(pd.socialLinks)) {
      const entries = Object.entries(pd.socialLinks as Record<string, string>).filter(([, v]) => v && typeof v === 'string' && (v as string).trim())
      if (entries.length > 0) {
        parts.push('\n【社交/链接】' + entries.map(([k, v]) => `${k}: ${v}`).join('；'))
      }
    }
    if (Array.isArray(pd?.customLinks) && pd.customLinks.length > 0) {
      const links = pd.customLinks
        .filter((l: unknown) => l && typeof l === 'object' && 'url' in (l as object))
        .map((l: { title?: string; url: string }) => (l.title ? `${l.title}: ${l.url}` : l.url))
      if (links.length > 0) parts.push(links.join('；'))
    }
    if (full && user.metadata) {
      const meta = user.metadata as { coreTraits?: string; communicationStyle?: string } | null
      if (meta?.coreTraits) parts.push(`【元数据】${meta.coreTraits}`)
    }
  } catch (_) {}

  const userId = user?.id ?? (user as { id?: string })?.id ?? ownerId
  if (full && userId) {
    const recentResponses = await withRetry(() =>
      prisma.userDailyQuestionResponse.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { questionText: true, answer: true },
      })
    )
    if (recentResponses.length > 0) {
      parts.push('\n【最近每日一问】')
      for (const r of recentResponses) {
        if (r.questionText?.trim()) parts.push(`Q: ${r.questionText}\nA: ${r.answer?.trim() || '(未填)'}`)
      }
    }
  }

  return parts.length ? parts.join('\n') : '暂无更多公开信息。'
}
