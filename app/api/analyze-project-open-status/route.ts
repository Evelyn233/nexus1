import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/analyze-project-open-status
 * 用 LLM 判断项目是否「开放招募/对外寻求合作」，并生成对外状态标签（如 Actively Hiring）
 * body: { title, detail?, peopleNeededCount, peopleNeededSummary?, stage?, showOnPlaza? }
 * returns: { isOpen: boolean, label: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const detail = typeof body?.detail === 'string' ? body.detail.trim().slice(0, 500) : ''
    const peopleNeededCount = typeof body?.peopleNeededCount === 'number' ? body.peopleNeededCount : 0
    const peopleNeededSummary = typeof body?.peopleNeededSummary === 'string' ? body.peopleNeededSummary.trim().slice(0, 300) : ''
    const stage = typeof body?.stage === 'string' ? body.stage.trim() : ''
    const showOnPlaza = body?.showOnPlaza === true

    const systemPrompt = `You are an assistant that labels whether a project is "open" for collaboration (actively seeking people/partners) and suggests a short public status label.

Input: project title, optional description, number of "people needed" entries, optional summary of who they're looking for, current stage, and whether the project is shown on a public plaza.

Rules:
1. **isOpen**: true only if the project has at least one "people needed" entry (peopleNeededCount >= 1) AND the project is intended to be visible (e.g. showOnPlaza or visible on profile). If peopleNeededCount is 0, set isOpen to false.
2. **label**: A very short phrase in English (2-4 words) for the public status, e.g. "Actively Hiring", "Open to collaboration", "Seeking partners", "Looking for contributors". When isOpen is false, you may return a neutral label like "Not actively seeking" or leave label as empty string.
3. Prefer "Actively Hiring" when the project is clearly recruiting; use "Open to collaboration" or "Seeking partners" for less formal/open collaboration.
4. Return only valid JSON: {"isOpen": true or false, "label": "..."}`

    const userPrompt = `Project title: ${title || '(none)'}
Short description: ${detail || '(none)'}
Number of "people needed" entries: ${peopleNeededCount}
Summary of who they need: ${peopleNeededSummary || '(none)'}
Current stage: ${stage || '(none)'}
Shown on public plaza: ${showOnPlaza}

Return JSON with isOpen and label.`

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ isOpen: false, label: '' })
    }

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
          temperature: 0.2,
          max_tokens: 120,
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

      let isOpen = peopleNeededCount > 0 && showOnPlaza
      let label = ''

      try {
        const cleaned = content
          .replace(/```json\s*/g, '')
          .replace(/```\s*$/g, '')
          .trim()
        const parsed = JSON.parse(cleaned)
        if (typeof parsed?.isOpen === 'boolean') isOpen = parsed.isOpen
        if (typeof parsed?.label === 'string' && parsed.label.trim()) {
          label = parsed.label.trim().slice(0, 32)
        }
      } catch {
        // fallback: derive from data
        if (peopleNeededCount > 0) {
          isOpen = true
          label = 'Actively Hiring'
        }
      }

      // Only return a display label when we consider the project open
      const displayLabel = isOpen ? (label || 'Actively Hiring') : ''
      return NextResponse.json({ isOpen, label: displayLabel })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        const fallback = peopleNeededCount > 0 && showOnPlaza
        return NextResponse.json({ isOpen: fallback, label: fallback ? 'Actively Hiring' : '' })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[analyze-project-open-status]', e)
    return NextResponse.json({ isOpen: false, label: '' })
  }
}
