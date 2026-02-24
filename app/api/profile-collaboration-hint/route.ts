import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getFullProfileContext } from '@/lib/profileContext'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET: 结合「访客」与「被访者」两方完整档案（含所有输入），生成「潜在合作可能性」，生成后自动入库
 * query: targetUserId（被访者）
 */
export async function GET(request: NextRequest) {
  try {
    const targetUserId = request.nextUrl.searchParams.get('targetUserId')
    if (!targetUserId?.trim()) {
      return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json(
        { hint: '和 TA 聊聊，探索合作可能', possibleTopics: [] },
        { status: 200 }
      )
    }

    const session = await getServerSession(authOptions)
    // viewerUserId = 访客（我），来自 session；targetUserId = 被访者（TA），来自 URL
    const viewerUserId = (session?.user as { id?: string })?.id ?? request.nextUrl.searchParams.get('viewerUserId')

    const [targetContext, viewerContext] = await Promise.all([
      getFullProfileContext(targetUserId.trim()),   // TA 的档案：User 表 + profileData + metadata + 每日一问
      viewerUserId ? getFullProfileContext(viewerUserId) : Promise.resolve(''),  // 我 的档案：同上
    ])

    if (process.env.NODE_ENV === 'development') {
      console.log('[profile-collaboration-hint] targetUserId(TA):', targetUserId, '| viewerUserId(我):', viewerUserId ?? '(未登录)')
    }

    if (!targetContext || targetContext.includes('暂无')) {
      return NextResponse.json(
        { hint: '和 TA 聊聊，探索合作可能', possibleTopics: [] },
        { status: 200 }
      )
    }

    const systemPrompt = `你是一个合作机会分析助手。根据【我】与【TA】两方档案，生成合作方向与可能话题。

【角色定义】
- 【我】= 访客 = 正在看页面的人，我的故事/职业/兴趣来自「【我】的档案」
- 【TA】= 被访者 = 被看的 profile 主人，TA 的故事/职业来自「【TA】的档案」
- 严格区分：【我】的信息只来自【我】的档案，【TA】的信息只来自【TA】的档案，禁止混淆

【生成逻辑（必须按此顺序思考）】
1. 先看「我」需要什么人、需要什么合作：从【我】的档案推断（含【合作可能】【想要合作的人】【目标】【兴趣】等），明确「我」在找的合作类型和理想合作者画像
2. 再看「我需要的合作」和「TA」有什么关系：TA 的专长/资源/方向是否匹配我需要的合作？TA 能补足我什么？我能否补足 TA 什么？
3. 输出：必须体现「我的价值」+「TA 与我所需合作的关系」，让访客觉得「这正是我在找的」

【核心：与访客强相关】
- hint 必须体现「我」能带来的价值，让访客看到时觉得「这说的就是我」
- 访客档案写「拍纪录片」→ 必须用「我的纪录片经验」；写「做产品」→ 用「我的产品能力」
- 禁止只写 TA 的方向：错误如「我与TA探索线下社交」若访客档案无社交相关，则与访客无关
- 正确示例：访客拍纪录片 + 想要探索真实社交记录 + TA 做社交产品 →「用我的纪录片经验与 TA 的社交产品探索真实社交记录」

【输出格式】严格按以下 JSON，不要其他内容：
{"hint":"一句话合作方向，25字内，用TA指被访者、用我指访客，必须体现我的专长","possibleTopics":["话题1","话题2","话题3"]}
- hint: 我与 TA 的合作方向，必须同时体现「我的价值」和「TA 与我所需合作的关系」
- possibleTopics: 3 个可聊的具体话题，基于双方档案`

    const userPrompt = viewerContext && !viewerContext.includes('暂无')
      ? `【我】= 访客（正在看页面的人），以下是我的档案：
${viewerContext}

【TA】= 被访者（被看的 profile 主人），以下是 TA 的档案：
${targetContext}

请按以下顺序思考后输出：
1. 从【我】的档案推断：我需要什么人、需要什么合作？
2. TA 与我需要的合作有什么关系？TA 能补足我什么？
3. 生成 hint 与 possibleTopics。hint 必须体现「我」能带来的价值，且说明「我需要的合作」与「TA」的关联。输出 JSON。`
      : `【TA】= 被访者（被看的 profile 主人）：\n${targetContext}\n\n（访客未登录，无【我】的档案）仅输出：{"hint":"和 TA 聊聊，探索合作可能","possibleTopics":[]}`

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
        temperature: 0.5,
        max_tokens: 200,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { hint: '和 TA 聊聊，探索合作可能', possibleTopics: [] },
        { status: 200 }
      )
    }

    const data = await response.json().catch(() => ({}))
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    let hint = '和 TA 聊聊，探索合作可能'
    let possibleTopics: string[] = []
    try {
      const parsed = JSON.parse(raw.replace(/```json?\s*|\s*```/g, '').trim())
      if (parsed?.hint && typeof parsed.hint === 'string') {
        hint = parsed.hint.replace(/^["'「」""'']|["'「」""'']$/g, '').trim() || hint
      }
      if (Array.isArray(parsed?.possibleTopics)) {
        possibleTopics = parsed.possibleTopics.filter((t: unknown) => typeof t === 'string' && t.trim()).slice(0, 5)
      }
    } catch {
      const singleLine = raw.replace(/^["'「」""'']|["'「」""'']$/g, '').trim()
      if (singleLine && !singleLine.startsWith('{')) hint = singleLine
    }

    let targetName: string | null = null
    try {
      let target = await prisma.user.findFirst({
        where: { OR: [{ id: targetUserId.trim() }, { profileSlug: targetUserId.trim() }] },
        select: { name: true },
      })
      if (!target && /^[a-zA-Z0-9_-]+$/.test(targetUserId)) {
        const slugLower = targetUserId.toLowerCase()
        const slugify = (s: string) => (s || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '') || ''
        const candidates = await prisma.user.findMany({
          where: { OR: [{ profileSlug: null }, { profileSlug: '' }] },
          take: 200,
          select: { name: true },
        })
        target = candidates.find((u) => slugify(u.name || '') === slugLower) || null
      }
      targetName = target?.name ?? null
    } catch (_) {}

    // 入库：访客已登录时写入 CollaborationHint
    if (viewerUserId && targetUserId.trim()) {
      try {
        await prisma.collaborationHint.upsert({
          where: {
            viewerUserId_targetUserId: { viewerUserId, targetUserId: targetUserId.trim() },
          },
          create: {
            viewerUserId,
            targetUserId: targetUserId.trim(),
            hint,
          },
          update: { hint },
        })
      } catch (e) {
        console.warn('[profile-collaboration-hint] 入库失败:', e)
      }
    }

    return NextResponse.json({ hint, targetName, possibleTopics })
  } catch (e) {
    console.warn('⚠️ [PROFILE-COLLABORATION-HINT]', e)
    return NextResponse.json(
      { hint: '和 TA 聊聊，探索合作可能', possibleTopics: [] },
      { status: 200 }
    )
  }
}
