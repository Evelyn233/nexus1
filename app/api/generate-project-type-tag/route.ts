import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generate-project-type-tag
 * 根据项目名称、描述、Open to 等用 AI 生成一个「项目类型」标签（如 纪录片/播客/社区/AI产品）
 * body: { projectTitle: string, detail?: string, peopleNeededTexts?: string[] }
 * returns: { projectTypeTag: string }
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
      return NextResponse.json({ error: '缺少项目名称' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM 未配置' }, { status: 503 })
    }

    const context = [
      projectTitle && `项目名称：${projectTitle}`,
      detail && `简介：${detail.slice(0, 300)}`,
      peopleNeededTexts.length > 0 && `在找的人：${peopleNeededTexts.join('、')}`,
    ].filter(Boolean).join('\n')

    const systemPrompt = `你是一个项目分类助手。根据用户提供的项目名称、简介、在找的合作者等信息，给出一个简短的「项目类型」标签。

要求：
- 标签 2～6 个字（中文）或 1～3 个英文词，例如：纪录片、播客、社区、AI产品、教育、SaaS、内容创作、线下活动、独立开发
- 只返回一个最贴切的类型，不要多个
- 只返回 JSON：{"projectTypeTag": "类型标签"}`

    const userPrompt = `${context}

请生成该项目的类型标签，只返回 JSON。`

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
          max_tokens: 80,
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

      let projectTypeTag = ''
      try {
        const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (typeof parsed?.projectTypeTag === 'string' && parsed.projectTypeTag.trim()) {
          projectTypeTag = parsed.projectTypeTag.trim().slice(0, 20)
        }
      } catch {
        // 解析失败时尝试取第一行或前几个词
        const firstLine = content.split(/[\n,，]/)[0]?.trim().slice(0, 20)
        if (firstLine) projectTypeTag = firstLine
      }

      if (!projectTypeTag) {
        return NextResponse.json({ error: '生成失败，请重试' }, { status: 422 })
      }

      return NextResponse.json({ projectTypeTag })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: '生成超时' }, { status: 504 })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[generate-project-type-tag]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '生成失败' },
      { status: 500 }
    )
  }
}
