import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ProjectInput = {
  text?: string
  detail?: string
  whatToProvide?: string
  cultureAndBenefit?: string
  peopleNeeded?: unknown[]
  stage?: string
  stageOrder?: string[]
  references?: unknown[]
  attachments?: unknown[]
  projectTypeTag?: string
}

/**
 * POST /api/analyze-project-completeness
 * 分析项目缺什么，返回建议补充的提示（规则 + 可选 LLM）
 * body: { project: ProjectInput }
 * returns: { suggestions: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const project: ProjectInput = body?.project && typeof body.project === 'object' ? body.project : {}

    const title = typeof project.text === 'string' ? project.text.trim() : ''
    const detail = typeof project.detail === 'string' ? project.detail.trim() : ''
    const whatToProvide = typeof project.whatToProvide === 'string' ? project.whatToProvide.trim() : ''
    const cultureAndBenefit = typeof project.cultureAndBenefit === 'string' ? project.cultureAndBenefit.trim() : ''
    const peopleNeeded = Array.isArray(project.peopleNeeded) ? project.peopleNeeded : []
    const stage = typeof project.stage === 'string' ? project.stage.trim() : ''
    const stageOrder = Array.isArray(project.stageOrder) ? project.stageOrder.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : []
    const refs = Array.isArray(project.references) ? project.references : []
    const atts = Array.isArray(project.attachments) ? project.attachments : []
    const projectTypeTag = typeof project.projectTypeTag === 'string' ? project.projectTypeTag.trim() : ''

    const suggestions: string[] = []

    if (!title) {
      suggestions.push('建议填写项目标题')
    }
    if (!detail || detail.length < 20) {
      suggestions.push('建议补充项目详情 / 详细描述（方便访客了解项目）')
    }
    if (!whatToProvide) {
      suggestions.push('建议填写「要提供的服务/产品/内容」（你实际会做什么）')
    }
    if (!cultureAndBenefit) {
      suggestions.push('建议填写 Culture & Benefit（团队文化、合作方式、参与者能获得什么）')
    }
    if (peopleNeeded.length === 0) {
      suggestions.push('建议添加 Look for（需要什么人 / 招募角色）')
    }
    if (!stage && stageOrder.length === 0) {
      suggestions.push('建议添加项目进度（Stage），如 Idea、Planning 等')
    }
    if (!projectTypeTag) {
      suggestions.push('建议添加项目类型标签（如纪录片、播客、社区、AI 产品）')
    }
    if (refs.length === 0 && atts.length === 0) {
      suggestions.push('建议添加链接或附件（作品、官网、资料等）')
    }

    // 可选：用 LLM 再生成 1 条简短总结提示（不重复上面已有项）
    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (apiKey && suggestions.length > 0) {
      const existingSet = new Set(suggestions.map((s) => s.slice(0, 20)))
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: `You are a concise assistant. Given a list of "what's missing" suggestions for a project profile, output ONE short extra hint in Chinese (or English if user content is in English), to encourage the user to complete the project. The hint should be different from the given list. Output only the one sentence, no prefix, no JSON. Keep under 30 characters if possible.`,
              },
              {
                role: 'user',
                content: `Project title: ${title || '(empty)'}\nExisting suggestions: ${suggestions.join('; ')}\nGive one more short hint (one sentence only):`,
              },
            ],
            temperature: 0.3,
            max_tokens: 80,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (res.ok) {
          const data = await res.json()
          const content = data?.choices?.[0]?.message?.content?.trim()
          if (content && content.length > 0 && content.length < 100) {
            const extra = content.replace(/^["']|["']$/g, '').trim()
            if (extra && !existingSet.has(extra.slice(0, 20))) {
              suggestions.push(extra)
            }
          }
        }
      } catch {
        // ignore LLM failure, rule-based suggestions are enough
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 8) })
  } catch (e) {
    console.error('[analyze-project-completeness]', e)
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}
