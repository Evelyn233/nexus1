import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const STAGES = ['Idea', 'Planning', 'Production', 'Filming', 'Post', 'Launch', 'Beta', 'Shipped']

/**
 * POST /api/analyze-content-tag
 * 用 LLM 分析用户的动作（添加链接/附件/找人），判断进度和标签
 * body: { type: 'link'|'attachment'|'people', title?, url?, description?, name?, peopleText?, projectTitle?, currentStage?, stageOrder? }
 * returns: { stage: string, tag: string, needConfirm: boolean, suggestUpdateStage: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const rawType = body?.type
    const type = rawType === 'attachment' ? 'attachment' : rawType === 'people' ? 'people' : 'link'
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const url = typeof body?.url === 'string' ? body.url.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const peopleText = typeof body?.peopleText === 'string' ? body.peopleText.trim() : ''
    const projectTitle = typeof body?.projectTitle === 'string' ? body.projectTitle.trim() : ''
    const currentStage = typeof body?.currentStage === 'string' ? body.currentStage.trim() : ''
    const stageOrder = Array.isArray(body?.stageOrder)
      ? (body.stageOrder as string[]).filter((s): s is string => typeof s === 'string' && s.trim()).map((s) => s.trim())
      : STAGES

    const allowedStages = stageOrder.length > 0 ? stageOrder : STAGES

    const contentDesc =
      type === 'people'
        ? `用户更新了「寻找合作者」：想找「${peopleText || '(无)'}」`
        : type === 'link'
        ? `链接：标题「${title || '(无)'}」，URL「${url || '(无)'}」，描述「${description || '(无)'}」`
        : `附件：文件名「${name || '(无)'}」`

    const systemPrompt = `你是一个项目内容标注助手。用户在项目里做了一个动作，需要你判断：

1. **进度（stage）**：这个动作暗示项目处于哪个阶段？从以下选项选一个：${allowedStages.join('、')}

2. **标签（tag）**：2-5 words in English, describe what this content/role/material **is**, not the intent.
   - tag = the content itself, not the action
   - People: use role/function name in English
     · 找社区运营 → "Community Ops"
     · 找视频剪辑 → "Video Editing"
     · 找联合创始人 → "Co-founder"
     · 找产品设计师 → "Product Design"
   - Links: describe the material type in English
     · 竞品网站 → "Competitor Ref"
     · 原型图链接 → "Prototype"
     · 宣传视频 → "Promo"
   - Attachments: document type in English
     · 脚本文件 → "Script"
     · 市场分析.pdf → "Market Analysis"

3. **needConfirm**：若难以判断，为 true；否则 false

4. **suggestUpdateStage**：若判断出的 stage 与当前进度「${currentStage || '未设置'}」不同，为 true

规则：
- stage 必须从给定选项中选一个，否则取第一项
- tag 必须用英文，2-5 words，不能包含"寻找"、"招募"等意图词汇
- 只返回 JSON，格式：{"stage":"...","tag":"...","needConfirm":false,"suggestUpdateStage":false}`

    const userPrompt = `项目名称：${projectTitle || '(未指定)'}
当前项目进度：${currentStage || '(未设置)'}

用户的动作：${contentDesc}

请分析并返回 JSON：`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM 未配置' }, { status: 503 })
    }

    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'LLM 调用失败')
      }

      const data = await res.json()
      const content = (data?.choices?.[0]?.message?.content ?? '').trim()

      let stage = allowedStages[0] ?? 'Idea'
      let tag = ''
      let needConfirm = true
      let suggestUpdateStageFromLLM = false

      try {
        const cleaned = content
          .replace(/```json\s*/g, '')
          .replace(/```\s*$/g, '')
          .trim()
        const parsed = JSON.parse(cleaned)
        const s = String(parsed?.stage ?? '').trim()
        stage = allowedStages.some((x) => x.toLowerCase() === s.toLowerCase())
          ? allowedStages.find((x) => x.toLowerCase() === s.toLowerCase())!
          : allowedStages[0] ?? 'Idea'
        tag = typeof parsed?.tag === 'string' && parsed.tag.trim() ? parsed.tag.trim().slice(0, 20) : tag
        needConfirm = Boolean(parsed?.needConfirm)
      } catch {
        // 解析失败时使用默认值
      }

      // 若 LLM 判断的 stage 和当前项目 stage 不一样，建议用户更新
      const suggestUpdateStage =
        currentStage.length > 0 &&
        stage.toLowerCase() !== currentStage.toLowerCase()

      return NextResponse.json({ stage, tag, needConfirm, suggestUpdateStage })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: '分析超时' }, { status: 504 })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[analyze-content-tag]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '分析失败' },
      { status: 500 }
    )
  }
}
