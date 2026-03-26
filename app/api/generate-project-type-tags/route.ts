import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generate-project-type-tags
 * 根据当前项目（名称、描述、在找的人）用 AI 生成多个「项目类型」候选标签，供「可添加的标签（AI 推荐）」使用
 * body: { projectTitle: string, detail?: string, peopleNeededTexts?: string[] }
 * returns: { projectTypeTags: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const projectTitle = typeof body?.projectTitle === 'string' ? body.projectTitle.trim() : ''
    const detail = typeof body?.detail === 'string' ? body.detail.trim() : ''
    const peopleNeededTexts = Array.isArray(body?.peopleNeededTexts)
      ? (body.peopleNeededTexts as string[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
      : []

    if (!projectTitle) {
      return NextResponse.json({ projectTypeTags: [] })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ projectTypeTags: [] })
    }

    const context = [
      projectTitle && `项目名称：${projectTitle}`,
      detail && `简介：${detail.slice(0, 300)}`,
      peopleNeededTexts.length > 0 && `在找的人：${peopleNeededTexts.join('、')}`,
    ].filter(Boolean).join('\n')

    const systemPrompt = `你是一个项目分类助手。根据用户提供的**当前项目**的名称、简介、在找的合作者等信息，给出 3～6 个简短的「项目类型」候选标签。

要求：
- 每个标签 2～6 个字（中文）或 1～3 个英文词，例如：纪录片、播客、社区、AI产品、教育、SaaS、内容创作、线下活动、独立开发
- 标签必须与**该项目**相关，不要泛泛的通用标签
- 只返回 JSON：{"projectTypeTags": ["标签1", "标签2", "标签3", ...]}`

    const userPrompt = `${context}

请根据以上项目信息，生成 3～6 个该项目相关的类型标签，只返回 JSON。`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)

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
          max_tokens: 150,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) return NextResponse.json({ projectTypeTags: [] })

      const data = await res.json()
      const content = (data?.choices?.[0]?.message?.content ?? '').trim()

      let projectTypeTags: string[] = []
      try {
        const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed?.projectTypeTags)) {
          projectTypeTags = parsed.projectTypeTags
            .filter((s: unknown) => typeof s === 'string' && String(s).trim())
            .map((s: string) => String(s).trim().slice(0, 20))
            .slice(0, 8)
        }
      } catch {
        // ignore
      }

      return NextResponse.json({ projectTypeTags })
    } catch {
      clearTimeout(timeoutId)
      return NextResponse.json({ projectTypeTags: [] })
    }
  } catch (e) {
    console.error('[generate-project-type-tags]', e)
    return NextResponse.json({ projectTypeTags: [] })
  }
}
