import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/generate-stages
 * 根据项目名称，用 LLM 生成一套个性化进度词（无固定顺序，让用户自选）
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
      return NextResponse.json({ error: '请先填写项目名称' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''

    /** 未配置 LLM 时仍返回一组可用阶段标签，避免编辑页 AI 推荐区域空白 */
    const defaultStagesForTitle = (title: string): string[] => {
      const t = title.toLowerCase()
      if (/film|video|doc|podcast|纪录|视频|播客|拍摄/.test(t)) {
        return ['Concept', 'Scripting', 'Pre-production', 'Shooting', 'Editing', 'Release']
      }
      if (/app|saas|software|产品|开发|api|ai|tech/.test(t)) {
        return ['Discovery', 'Design', 'Build', 'Test', 'Launch', 'Growth']
      }
      if (/community|社群|社区|event|活动/.test(t)) {
        return ['Ideation', 'Outreach', 'Onboarding', 'Engagement', 'Scale']
      }
      return ['Research', 'Planning', 'Build', 'Launch', 'Optimize', 'Scale']
    }

    if (!apiKey) {
      return NextResponse.json({ stages: defaultStagesForTitle(projectTitle) })
    }

    const systemPrompt = `You are a project stage advisor. Given a project name, generate 6-10 words/phrases describing different stages of that project.

Requirements:
- Match the project type (e.g. film: Scripting, Shooting, Editing, Color, Sound, Release; tech product: Research, Prototype, Dev, Test, Launch; content: Topic, Interview, Draft, Art, Publish)
- Each word 2-8 chars, in English
- No fixed order; these are loose tags for the user to pick
- Return JSON array only: ["Stage1","Stage2",...], no explanation`

    const userPrompt = `Project: ${projectTitle}\n\nGenerate stage words for this project (in English):`

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
        const raw = Array.isArray(parsed)
          ? parsed
          : (parsed && typeof parsed === 'object' && Array.isArray(parsed.stages)
            ? parsed.stages
            : [])
        stages = raw
          .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s: string) => s.trim().slice(0, 20))
          .slice(0, 12)
      } catch {
        // 解析失败，尝试按行拆分（LLM 有时返回纯文本列表）
        const lines = content
          .split(/[\n,，]/)
          .map((s: string) => s.replace(/^[\s\-*\d.)]+|["']/g, '').trim())
          .filter((s: string) => s.length > 0 && s.length <= 20)
        if (lines.length > 0) {
          stages = lines.slice(0, 12)
        }
      }

      if (stages.length === 0) {
        stages = defaultStagesForTitle(projectTitle)
      }

      return NextResponse.json({ stages })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ stages: defaultStagesForTitle(projectTitle) })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[generate-stages]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '生成失败' },
      { status: 500 }
    )
  }
}
