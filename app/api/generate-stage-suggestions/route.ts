import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generate-stage-suggestions
 * body: { projectTitle: string }
 * returns: { stages: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const projectTitle = typeof body?.projectTitle === 'string' ? body.projectTitle.trim() : ''
    if (!projectTitle) {
      return NextResponse.json({ error: '缺少项目名称' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM 未配置' }, { status: 503 })
    }

    const systemPrompt = `你是一个项目进度词汇生成助手。根据用户提供的项目名称，生成 6~10 个适合该项目的进度/里程碑词语。

要求：
- 词语要贴合该类型项目的实际工作流程
- 每个词 2~8 字，简洁直观
- 不要有固定顺序，词语之间彼此独立
- 覆盖从早期到成熟的不同阶段，但不要强调顺序
- 用项目所在领域的专业词汇，避免泛泛的"开始/进行中/完成"
- 只返回 JSON：{"stages": ["词语1", "词语2", ...]}`

    const userPrompt = `项目名称：${projectTitle}

请生成适合这个项目的进度词汇，只返回 JSON。`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

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
          temperature: 0.7,
          max_tokens: 300,
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

      let stages: string[] = []
      try {
        const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
        const parsed = JSON.parse(cleaned)
        if (Array.isArray(parsed?.stages)) {
          stages = parsed.stages
            .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
            .map((s: string) => s.trim().slice(0, 20))
            .slice(0, 12)
        }
      } catch {
        // 解析失败时返回空
      }

      return NextResponse.json({ stages })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: '生成超时' }, { status: 504 })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[generate-stage-suggestions]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '生成失败' },
      { status: 500 }
    )
  }
}
