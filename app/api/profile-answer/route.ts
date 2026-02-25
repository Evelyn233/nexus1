import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { getProfileContext } from '@/lib/profileContext'

export const dynamic = 'force-dynamic'

/** 获取 profile 主人的 userId：优先 targetUserId，其次当前登录用户，再 AppConfig，env，最后首个用户 */
async function getProfileOwnerId(
  targetUserId?: string | null,
  sessionUserId?: string | null
): Promise<string | null> {
  if (targetUserId) return targetUserId
  if (sessionUserId) return sessionUserId
  try {
    const row = await prisma.appConfig.findUnique({
      where: { key: 'profile_owner_user_id' },
      select: { value: true },
    })
    if (row?.value?.trim()) return row.value.trim()
  } catch {
    // app_config 表可能不存在或未迁移，跳过
  }
  const id =
    process.env.PROFILE_OWNER_USER_ID ||
    (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }))?.id
  return id ?? null
}

/** 可选：用 Neon RAG 检索 profile 主人相关片段（无 Python 后端） */
async function getRagSnippet(ownerId: string | null, query: string): Promise<string> {
  if (!ownerId || !query.trim()) return ''
  try {
    const { searchRagChunks, answerFromChunks } = await import('@/lib/ragNeon')
    const chunks = await searchRagChunks(ownerId, query.trim())
    const answer = await answerFromChunks(query.trim(), chunks)
    return answer ? `\n【RAG 检索片段（profile 主人已入库的内容）】\n${answer}` : ''
  } catch {
    return ''
  }
}

/**
 * POST: 用 profile 数据库 + DeepSeek 回答用户问题（不断校准交互）
 * body: { messages: [{ role: 'user'|'assistant', content: string }], targetUserId?: string }
 * 返回：回答基于 profile；若 profile 无法回答则 canAnswerFromProfile=false，前端可展示「问 profile 主人」
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const messages = Array.isArray(body.messages) ? body.messages : []
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId : undefined

    // 未传 targetUserId 时（如从全局底部输入框打开）：用当前登录用户的 profile，避免用到「第一个用户」
    let sessionUserId: string | null = null
    try {
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        const u = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
        sessionUserId = u?.id ?? null
      }
    } catch (_) {}

    let ownerId: string | null = null
    try {
      ownerId = await getProfileOwnerId(targetUserId, sessionUserId)
    } catch (e) {
      console.warn('⚠️ [PROFILE-ANSWER] getProfileOwnerId failed, continuing with empty profile', e)
    }

    const lastUserContent = [...messages].reverse().find((m: { role?: string }) => m?.role === 'user')?.content
    const userQuestion = typeof lastUserContent === 'string' ? lastUserContent.trim() : ''
    if (!userQuestion) {
      return NextResponse.json({ error: '请发送一个问题' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json(
        { error: '回答服务未配置 DEEPSEEK_API_KEY' },
        { status: 503 }
      )
    }

    // 检索 profile 主人数据；任一步失败只降级为空，不整次失败
    let profileContext = '暂无公开档案。'
    let ragSnippet = ''
    try {
      profileContext = await getProfileContext(ownerId)
    } catch (e) {
      console.warn('⚠️ [PROFILE-ANSWER] getProfileContext failed, using fallback', e)
    }
    try {
      ragSnippet = await getRagSnippet(ownerId, userQuestion)
    } catch (e) {
      console.warn('⚠️ [PROFILE-ANSWER] getRagSnippet failed, continuing without RAG', e)
    }
    const retrievedBlock = profileContext + ragSnippet

    const systemPrompt = `你是公开页底部「和 AI 聊聊这个人」的助手。下面「已检索的 profile 主人数据」就是当前这位 profile 主人的公开档案（与公开页展示完全一致），你必须真的用这份数据回答。

重要：检索数据的第一项是【一句话自我介绍】，是 profile 主人自己填的总结（如「喜欢拍纪录片」「做纪录片」等）。只要这句话里已经包含与问题相关的信息，你必须直接据此回答（例如问「这人喜欢拍纪录片吗」而一句话里写了拍纪录片，就回答「是的，TA 喜欢拍纪录片」并简短追问），不得说「暂无」「无法确认」「档案里没有」；此时 canAnswerFromProfile 为 true。
仅当整份检索数据里确实没有任何与问题相关的内容时，才可说「档案里暂无这方面信息」并反问；此时 canAnswerFromProfile 为 false。
回答要简短、自然，适当反问把话头抛回访客，用 JSON 且仅用 JSON 回复：{"answer":"你的回答内容","canAnswerFromProfile":true或false}`

    const chatContent = messages.length
      ? messages.map((m: { role?: string; content?: string }) => `${m.role}: ${m.content || ''}`).join('\n')
      : `user: ${userQuestion}`

    const userPrompt = `【已检索的 profile 主人数据】\n${retrievedBlock}\n\n【对话】\n${chatContent}\n\n【请仅输出一行 JSON】`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    let response: Response
    try {
      response = await fetch('https://api.deepseek.com/chat/completions', {
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
          temperature: 0.4,
          max_tokens: 800,
        }),
        signal: controller.signal,
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError'
      console.error('❌ [PROFILE-ANSWER] DeepSeek fetch failed', isAbort ? '(timeout)' : '', fetchErr)
      return NextResponse.json(
        { error: isAbort ? '请求超时，请稍后再试' : '网络异常，请稍后再试' },
        { status: 502 }
      )
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text()
      console.error('❌ [PROFILE-ANSWER] DeepSeek error:', response.status, errText)
      return NextResponse.json(
        { error: '回答服务暂时不可用，请稍后再试' },
        { status: 502 }
      )
    }

    let data: { choices?: { message?: { content?: string } }[] }
    try {
      data = await response.json()
    } catch (parseErr) {
      console.error('❌ [PROFILE-ANSWER] DeepSeek response JSON parse failed', parseErr)
      return NextResponse.json(
        { error: '回答解析失败，请稍后再试' },
        { status: 502 }
      )
    }
    const raw = data?.choices?.[0]?.message?.content?.trim() || ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : raw
    let answer = userQuestion
    let canAnswerFromProfile = true
    try {
      const obj = JSON.parse(jsonStr) as { answer?: string; canAnswerFromProfile?: boolean }
      if (typeof obj.answer === 'string') answer = obj.answer.trim() || answer
      if (typeof obj.canAnswerFromProfile === 'boolean') canAnswerFromProfile = obj.canAnswerFromProfile
    } catch {
      answer = raw.replace(/^["']|["']$/g, '').trim() || answer
    }

    return NextResponse.json({
      answer,
      canAnswerFromProfile,
      profileOwnerId: ownerId,
    })
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.error('❌ [PROFILE-ANSWER]', err.message, err)
    const msg = process.env.NODE_ENV === 'development' && err.message
      ? `回答失败：${err.message}`
      : '回答失败，请稍后再试'
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
