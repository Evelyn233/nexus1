import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export type CollabIntent = 'guest' | 'partner' | 'part-time'

const INTENT_LABELS: Record<CollabIntent, string> = {
  guest: '嘉宾',
  partner: '合作伙伴',
  'part-time': '纯兼职',
}

/**
 * POST /api/analyze-collab-intent
 * 根据「找人」文案用 AI 识别合作方式：嘉宾 / 合作伙伴 / 纯兼职
 * body: { peopleText: string, detail?: string }
 * returns: { collabIntent: CollabIntent, label: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const peopleText = typeof body?.peopleText === 'string' ? body.peopleText.trim() : ''
    const detail = typeof body?.detail === 'string' ? body.detail.trim() : ''

    if (!peopleText) {
      return NextResponse.json({ error: '缺少找人描述' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM 未配置' }, { status: 503 })
    }

    const context = [peopleText, detail].filter(Boolean).join('\n')
    const systemPrompt = `你是一个合作意图分类助手。根据用户写的「在找的人」描述，判断合作方式属于以下哪一种：

1. **guest（嘉宾）**：单次/短期参与，如播客嘉宾、访谈对象、活动嘉宾、一次性的内容合作
2. **partner（合作伙伴）**：长期或深度合作，如联合创始人、核心成员、长期搭档、共同创作
3. **part-time（纯兼职）**：按时间/项目计费的兼职角色，如兼职剪辑、兼职运营、外包

规则：
- 只返回一个最贴切的类型
- 只返回 JSON，格式：{"collabIntent":"guest"} 或 {"collabIntent":"partner"} 或 {"collabIntent":"part-time"}
- collabIntent 必须是 guest、partner、part-time 之一`

    const userPrompt = `在找的人描述：\n${context}\n\n请判断合作方式，只返回 JSON。`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

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
          max_tokens: 60,
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
      let collabIntent: CollabIntent = 'partner'
      try {
        const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
        const parsed = JSON.parse(cleaned)
        const raw = (parsed?.collabIntent ?? '').toLowerCase()
        if (raw === 'guest' || raw === 'partner' || raw === 'part-time') {
          collabIntent = raw as CollabIntent
        }
      } catch {
        if (/guest|嘉宾/.test(content)) collabIntent = 'guest'
        else if (/part-time|兼职/.test(content)) collabIntent = 'part-time'
      }

      return NextResponse.json({
        collabIntent,
        label: INTENT_LABELS[collabIntent],
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return NextResponse.json({ error: '识别超时' }, { status: 504 })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[analyze-collab-intent]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '识别失败' },
      { status: 500 }
    )
  }
}
