import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** 获取「这个人」的档案摘要（用于校准上下文），默认取首个用户或 env 指定 */
async function getProfileSummaryForCalibration(targetUserId?: string | null): Promise<string> {
  const userId =
    targetUserId ||
    process.env.PROFILE_OWNER_USER_ID ||
    (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id

  if (!userId) return '暂无公开档案。'

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { metadata: true },
  })

  if (!user) return '暂无公开档案。'

  const parts: string[] = []
  // 一句话自我介绍放最前，与 profile-answer 一致
  if (user.profileData) {
    try {
      const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
      const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.openingStatement || pd?.whoIAm)?.trim()
      if (oneLine) parts.push(`一句话自我介绍：${typeof oneLine === 'string' ? oneLine : ''}`)
    } catch {}
  }
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
  if (user.metadata?.communicationStyle) {
    try {
      const style = JSON.parse(user.metadata.communicationStyle as string)
      if (Array.isArray(style) && style.length) parts.push(`沟通风格：${style.join('、')}`)
    } catch {}
  }
  if (user.profileData) {
    try {
      const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
      const oneLine = (pd?.oneSentenceDesc || pd?.userSay || pd?.openingStatement || pd?.whoIAm)?.trim()
      if (pd?.headline && pd?.headline !== oneLine) parts.push(`简介：${pd.headline}`)
      if (pd?.bio) parts.push(`简介详情：${typeof pd.bio === 'string' ? pd.bio.slice(0, 200) : ''}`)
    } catch {}
  }

  return parts.length ? parts.join('\n') : '暂无更多公开信息。'
}

/**
 * POST: 用 profile 数据库 + DeepSeek 校准用户输入
 * body: { input: string, targetUserId?: string }
 * 不接 profile 页面、不触发生成，仅返回校准后的文案
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const input = typeof body.input === 'string' ? body.input.trim() : ''
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : undefined

    if (!input) {
      return NextResponse.json({ error: '请输入内容' }, { status: 400 })
    }

    const profileSummary = await getProfileSummaryForCalibration(targetUserId)

    const systemPrompt = `你是一个输入校准助手。访客会在「对这个人的疑问和看法」输入框里写下粗线条的想法，你需要结合这个人的公开档案，把访客的输入校准成一句清晰、具体、针对这个人的疑问或看法。保持原意，可适度润色、补全指代，不要编造档案里没有的信息。只输出校准后的那一句话，不要解释、不要加引号。`

    const userPrompt = `【这个人 的公开档案摘要】\n${profileSummary}\n\n【访客输入】\n${input}\n\n【请输出校准后的一句话】`

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json(
        { error: '校准服务未配置 DEEPSEEK_API_KEY' },
        { status: 503 }
      )
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text()
      console.error('❌ [CALIBRATE] DeepSeek error:', response.status, errText)
      return NextResponse.json(
        { error: '校准服务暂时不可用，请稍后再试' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    const calibrated = raw.replace(/^["']|["']$/g, '').trim() || input

    return NextResponse.json({ calibrated })
  } catch (e) {
    console.error('❌ [CALIBRATE]', e)
    return NextResponse.json(
      { error: '校准失败，请稍后再试' },
      { status: 500 }
    )
  }
}
