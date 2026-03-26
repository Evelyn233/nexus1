import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma, { withRetry } from '@/lib/prisma'
import { getQuestionForDate, getTodayStart, type QuestionRating, type QuestionDimension } from '@/lib/dailyQuestion'
import { generateInsightsFromQA } from '@/lib/insightsFromQA'

export const dynamic = 'force-dynamic'

const RATINGS: QuestionRating[] = ['milder', 'sharper', 'keep', 'more_personal', 'other']

function getUserId(session: { user?: { id?: string | null; email?: string | null } }): Promise<string | null> {
  const id = (session?.user as any)?.id
  const email = session?.user?.email
  if (id) return withRetry(() => prisma.user.findUnique({ where: { id }, select: { id: true } })).then(u => u?.id ?? null)
  if (email) return withRetry(() => prisma.user.findFirst({ where: { email }, select: { id: true } })).then(u => u?.id ?? null)
  return Promise.resolve(null)
}

/** 获取某用户的 profile 摘要（用于与问题方向结合生成下一题） */
async function getProfileSummaryForUser(userId: string): Promise<string> {
  const user = await withRetry(() => prisma.user.findUnique({
    where: { id: userId },
    include: { metadata: true },
  }))
  if (!user) return '暂无公开档案。'
  const parts: string[] = []
  if (user.name) parts.push(`姓名：${user.name}`)
  if (user.location) parts.push(`所在地：${user.location}`)
  if (user.personality) parts.push(`个性：${user.personality}`)
  if (user.selfInterests) parts.push(`兴趣：${user.selfInterests}`)
  if (user.selfGoals) parts.push(`目标：${user.selfGoals}`)
  if (user.metadata?.coreTraits) {
    try {
      const traits = JSON.parse(user.metadata.coreTraits as string)
      if (Array.isArray(traits) && traits.length) parts.push(`特质：${traits.join('、')}`)
    } catch {}
  }
  if (user.profileData) {
    try {
      const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
      // 一句话介绍/用户原话（如 "I'm a model, do documentary"）优先，今日问题必须与之相关
      const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.openingStatement || pd?.whoIAm || pd?.headline)?.trim()
      if (oneLine) parts.push(`自我介绍/一句话：${typeof oneLine === 'string' ? oneLine : ''}`)
      const collabWhat = Array.isArray(pd?.collaborationPossibility)
        ? (pd.collaborationPossibility as string[]).filter(Boolean).join('；')
        : (pd?.collaborationPossibility && typeof pd.collaborationPossibility === 'string' ? pd.collaborationPossibility.trim() : '')
      if (collabWhat) parts.push(`合作可能：${collabWhat}`)
      const collabWho = Array.isArray(pd?.peopleToCollaborateWith)
        ? (pd.peopleToCollaborateWith as string[]).filter(Boolean).join('；')
        : (pd?.peopleToCollaborateWith && typeof pd.peopleToCollaborateWith === 'string' ? pd.peopleToCollaborateWith.trim() : '')
      if (collabWho) parts.push(`想要合作的人：${collabWho}`)
      if (pd?.headline && pd.headline !== oneLine) parts.push(`简介：${pd.headline}`)
      if (pd?.bio) parts.push(`简介详情：${typeof pd.bio === 'string' ? pd.bio.slice(0, 200) : ''}`)
      // 感兴趣的话题：Q&A 有助于生成延续性追问
      const qaList = Array.isArray(pd?.qaList) ? pd.qaList : []
      if (qaList.length > 0) {
        const qaShort = (qaList as { question?: string; answer?: string }[])
          .slice(-5)
          .filter((q) => (q?.question ?? '').trim())
          .map((q) => `Q: ${(q.question ?? '').slice(0, 80)}`)
        if (qaShort.length) parts.push(`感兴趣的话题：${qaShort.join(' | ')}`)
      }
      const tags = Array.isArray(pd?.tags) ? (pd.tags as string[]).slice(-10) : []
      if (tags.length) parts.push(`标签/话题：${tags.join('、')}`)
      // 项目与「找人」：每日一问需根据用户任何输入（含项目、进度、找人需求）出题
      const projects = Array.isArray(pd?.projects) ? (pd.projects as { text?: string; stage?: string; peopleNeeded?: { text?: string }[] }[]) : []
      if (projects.length > 0) {
        const projLines = projects
          .map((p) => {
            const title = (p.text || '').trim()
            const stage = (p.stage || '').trim()
            const needs = (p.peopleNeeded || []).map((n) => (n.text || '').trim()).filter(Boolean)
            return [title, stage, needs.join('、')].filter(Boolean).join(' | ')
          })
          .filter(Boolean)
        if (projLines.length) parts.push(`项目与找人：${projLines.join('；')}`)
      }
      const workIntro = Array.isArray(pd?.workIntroductions) ? (pd.workIntroductions as { name?: string; description?: string }[]) : []
      if (workIntro.length > 0) {
        const introLines = workIntro.map((w) => [w.name, w.description].filter(Boolean).join(': ')).filter(Boolean)
        if (introLines.length) parts.push(`作品/简介：${introLines.join('；')}`)
      }
    } catch {}
  }
  return parts.length ? parts.join('\n') : '暂无更多公开信息。'
}

/** 获取用户最新动态：最近几轮每日一问的 Q&A + profileData 里的洞察/标签，用于出题时延续和追问 */
async function getLatestDynamicsForUser(userId: string): Promise<string> {
  const [recentResponses, user] = await Promise.all([
    withRetry(() => prisma.userDailyQuestionResponse.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { questionText: true, answer: true, createdAt: true },
    })),
    withRetry(() => prisma.user.findUnique({
      where: { id: userId },
      select: { profileData: true },
    })),
  ])
  const parts: string[] = []
  if (recentResponses.length > 0) {
    parts.push('【最近每日一问 Q&A】')
    recentResponses.forEach((r, i) => {
      parts.push(`Q${i + 1}: ${r.questionText}`)
      if (r.answer?.trim()) parts.push(`A${i + 1}: ${r.answer.trim().slice(0, 300)}${(r.answer?.length ?? 0) > 300 ? '…' : ''}`)
    })
  }
  if (user?.profileData) {
    try {
      const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
      const insights = Array.isArray(pd.insights) ? (pd.insights as string[]).slice(-8) : []
      const tags = Array.isArray(pd.tags) ? (pd.tags as string[]).slice(-12) : []
      if (insights.length) parts.push('【最近洞察】' + insights.join('、'))
      if (tags.length) parts.push('【最近标签/话题】' + tags.join('、'))
    } catch {}
  }
  return parts.length ? parts.join('\n') : ''
}

/** 用 profile 摘要 + 方向提示 + 最新动态，通过 DeepSeek 生成一条有实时性和延续性的问题 */
async function generateQuestionFromProfile(profileSummary: string, directionHint: string, latestDynamics: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY || ''
  if (!apiKey) return null
  const systemPrompt = `你是每日一问的出题助手。问题**必须严格基于这个人的 profile**，绝不能脱离 profile 去问通用问题。

【核心规则】
1. **100% 紧扣 profile**：若 profile 的自我介绍写了「模特、纪录片、拍片」，问题必须围绕这些（如：最近在拍什么？模特工作里最难忘的瞬间？纪录片选题怎么来的？）。若写了「做产品、创业」，再问产品与创业相关。**禁止**在 profile 未提及的情况下问 AI、技术、哲学、创业等话题。
2. **合作可能**：若 profile 中有「合作可能」字段，优先参考该内容出题，可问与 TA 合作方向相关的问题（如社群共建、内容合作、线下活动等）。
3. **禁止擅自假设**：绝不要假设 TA 是 AI 创始人、创业者、投资人等。profile 没写的身份，就不要问。
4. **具体、人话**：一句话说清，像真人会问的。禁止堆砌抽象词。
5. **延续动态**：若 TA 最近答过某话题，可追问延续。
6. 结合 TA 的职业、兴趣、所在地、个性、标签；根据用户希望的方向（更温和/更尖锐/保持/更个人化）调整语气。

只输出一条问题，不要解释、不要引号。`
  const dynamicsBlock = latestDynamics.trim() ? `\n【用户最新动态与洞察】\n${latestDynamics}\n` : ''
  const minimalHint = (profileSummary.includes('暂无') || profileSummary.length < 50)
    ? '\n（若 profile 信息很少，请出一个极其开放、不假设任何职业的问题，如「今天你最有冲动想做的一件事是什么？」这类）'
    : ''
  const userPrompt = `【profile 摘要】\n${profileSummary}\n${dynamicsBlock}【用户希望的问题方向/风格】\n${directionHint}${minimalHint}\n\n【请输出一条与 profile 相关且延续 TA 最新动态的今日问题】`
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    return raw.replace(/^["']|["']$/g, '').trim() || null
  } catch {
    return null
  }
}

/** 将本次 Q&A 与洞察追加到用户的 profileData 并保存 */
async function appendDailyQAToProfile(
  userId: string,
  questionText: string,
  answer: string | null,
  insights: string[],
  tags: string[]
): Promise<void> {
  const user = await withRetry(() => prisma.user.findUnique({
    where: { id: userId },
    select: { profileData: true },
  }))
  if (!user) return
  let pd: Record<string, unknown> = {}
  if (user.profileData) {
    try {
      pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData as Record<string, unknown>)
    } catch {}
  }
  const qaList = Array.isArray(pd.qaList)
    ? (pd.qaList as { question?: string; answer?: string; showInPreview?: boolean; saveToDb?: boolean }[])
    : []
  const existingInsights = Array.isArray(pd.insights) ? (pd.insights as string[]) : []
  const existingTags = Array.isArray(pd.tags) ? (pd.tags as string[]) : []

  // 有回答时加入「感兴趣的话题」，默认不在卡片显示、不存入数据库；用户可在列表里自行勾选
  const hasAnswer = (answer ?? '').trim().length > 0
  qaList.push({
    question: questionText,
    answer: answer ?? '',
    showInPreview: false,
    saveToDb: false,
  })
  const mergedInsights = Array.from(new Set([...existingInsights, ...insights]))
  const mergedTags = tags.length ? Array.from(new Set([...existingTags, ...tags])) : existingTags

  pd.qaList = qaList
  pd.insights = mergedInsights
  if (mergedTags.length) pd.tags = mergedTags

  await prisma.user.update({
    where: { id: userId },
    data: { profileData: JSON.stringify(pd) },
  })
}

/**
 * GET: 获取今日问题 + 当前用户是否已回答、已答内容与评价
 */
export async function GET() {
  try {
    await prisma.$connect()
    const session = await getServerSession(authOptions)
    const userId = session ? await getUserId(session) : null

    const todayStart = getTodayStart()

    if (!userId) {
      const questionText = getQuestionForDate(new Date(), null)
      return NextResponse.json({
        questionText,
        questionDate: todayStart.toISOString(),
        respondedCountToday: 0,
        lastResponse: null,
      })
    }

    const responsesToday = await prisma.userDailyQuestionResponse.findMany({
      where: { userId, questionDate: todayStart },
      orderBy: { createdAt: 'desc' },
    })
    const respondedCountToday = responsesToday.length
    const lastResponse = responsesToday[0] ?? null

    // 已登录用户：一律基于 profile 生成与 TA 相关的问题，不用通用池
    const profileSummary = await getProfileSummaryForUser(userId)
    let directionHint: string
    if (lastResponse) {
      if (lastResponse.rating === 'other' && lastResponse.ratingNote?.trim()) {
        directionHint = lastResponse.ratingNote.trim()
      } else {
        const labels: Record<string, string> = {
          milder: '下次更温和一点',
          sharper: '下次更尖锐一点',
          keep: '保持这样就好',
          more_personal: '更个人化一点',
        }
        directionHint = labels[lastResponse.rating] ?? '保持这样就好'
      }
    } else {
      directionHint = '根据 profile 生成一条与 TA 相关的问题，可涉及职业、兴趣、所在地、个性等，一问即可。'
    }
    const latestDynamics = await getLatestDynamicsForUser(userId)
    const generated = await generateQuestionFromProfile(profileSummary, directionHint, latestDynamics)
    const questionText = generated ?? getQuestionForDate(new Date(), null)

    return NextResponse.json({
      questionText,
      questionDate: todayStart.toISOString(),
      respondedCountToday,
      lastResponse: lastResponse
        ? {
            answer: lastResponse.answer,
            rating: lastResponse.rating,
            ratingNote: lastResponse.ratingNote,
            createdAt: lastResponse.createdAt.toISOString(),
          }
        : null,
    })
  } catch (e) {
    console.error('❌ [DAILY-QUESTION] GET error:', e)
    return NextResponse.json({ error: '获取今日问题失败' }, { status: 500 })
  }
}

/**
 * POST: 提交今日回答 + 对问题的评价（下次更温和/更尖锐/保持等）
 * body: { answer?: string, rating: 'milder'|'sharper'|'keep'|'more_personal'|'other', ratingNote?: string }
 */
export async function POST(request: Request) {
  try {
    await prisma.$connect()
    const session = await getServerSession(authOptions)
    const userId = session ? await getUserId(session) : null

    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const answer = typeof body.answer === 'string' ? body.answer.trim() || null : null
    const ratingRaw = body.rating
    const rating = ratingRaw && RATINGS.includes(ratingRaw as QuestionRating) ? (ratingRaw as QuestionRating) : 'keep'
    const ratingNote = typeof body.ratingNote === 'string' ? body.ratingNote.trim() || null : null
    const questionText = typeof body.questionText === 'string' ? body.questionText.trim() : null

    if (rating === 'other' && !ratingNote) {
      return NextResponse.json(
        { error: '选择「其他」时请填写你希望的问题方向，将用于生成下一题' },
        { status: 400 }
      )
    }

    const todayStart = getTodayStart()
    const questionTextToSave = questionText || getQuestionForDate(new Date())

    const created = await prisma.userDailyQuestionResponse.create({
      data: {
        userId,
        questionDate: todayStart,
        questionText: questionTextToSave,
        answer: answer ?? undefined,
        rating,
        ratingNote: ratingNote ?? undefined,
      },
    })

    // 仅当用户填写了回答时，才写入「感兴趣的话题」并生成洞察；未回答只记入每日一问（不计入 qaList）
    const hasAnswer = (answer ?? '').trim().length > 0
    let insights: string[] = []
    let tags: string[] = []
    if (hasAnswer) {
      try {
        const extracted = await generateInsightsFromQA(questionTextToSave, answer)
        insights = extracted.insights
        tags = extracted.tags
      } catch (extractErr) {
        console.warn('❌ [DAILY-QUESTION] generateInsightsFromQA failed:', extractErr)
      }
      try {
        await appendDailyQAToProfile(userId, questionTextToSave, answer, insights, tags)
      } catch (appendErr) {
        console.warn('❌ [DAILY-QUESTION] appendDailyQAToProfile failed:', appendErr)
      }
    }

    return NextResponse.json({
      success: true,
      response: {
        id: created.id,
        answer: created.answer,
        rating: created.rating,
        ratingNote: created.ratingNote,
        createdAt: created.createdAt.toISOString(),
      },
      insights,
      tags,
      savedToProfile: hasAnswer,
    })
  } catch (e: unknown) {
    console.error('❌ [DAILY-QUESTION] POST error:', e)
    const err = e as { code?: string; message?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: '今日已答过一题，当前数据库仍限制一天一条。请管理员在项目根目录运行：npx prisma db push' },
        { status: 409 }
      )
    }
    if (err?.message?.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '今日已答过一题。请管理员运行 npx prisma db push 以支持同一天多题。' },
        { status: 409 }
      )
    }
    const message = err?.message && typeof err.message === 'string' ? err.message : '提交失败'
    return NextResponse.json(
      { error: message.length > 200 ? '提交失败' : message },
      { status: 500 }
    )
  }
}
