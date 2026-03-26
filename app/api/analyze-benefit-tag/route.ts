import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/analyze-benefit-tag
 * Summarize user's “what benefit can you bring” into a concise English tag.
 * body: { text: string, projectTitle?: string }
 * returns: { tag: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const text = typeof body?.text === 'string' ? body.text.trim() : ''
    const projectTitle = typeof body?.projectTitle === 'string' ? body.projectTitle.trim() : ''

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const systemPrompt = `You are a benefit tag summarizer.

Given a user's description of what benefit they can bring to a project,
generate ONE concise English tag (2-5 words) that represents the concrete benefit.

Rules:
- The tag must be the benefit itself (e.g., Money/Funding, Resource Access, Industry Network, Detailed Profile Review, Salary Contribution)
- Do NOT output sentences. Output JSON only.
- Output JSON format: {"tag":"..."}`

    const userPrompt = `Project title: ${projectTitle || '(n/a)'}\n\nBenefit description:\n${text}\n\nReturn JSON:`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM 未配置' }, { status: 503 })
    }

    const res = await fetch('https://api.deepseek.com/chat/completions', {
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
        temperature: 0.3,
        max_tokens: 120,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(errText || 'LLM 调用失败')
    }

    const data = await res.json().catch(() => ({}))
    const content = (data?.choices?.[0]?.message?.content ?? '').trim()

    let tag = ''
    try {
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
      const parsed = JSON.parse(cleaned) as { tag?: string }
      tag = typeof parsed?.tag === 'string' ? parsed.tag.trim() : ''
    } catch {
      // fallback: take first chunk
      tag = text.split(/[\\n\\r]/)[0].trim().slice(0, 40)
    }

    tag = (tag || '').replace(/[\\n\\r]/g, ' ').trim()

    // Remove hidden unicode: zero-width + BOM + soft-hyphen + format control chars
    tag = tag.replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u061C\u06DD\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')

    // 纯 ASCII 标签跳过 NFKD，避免极少数环境下与后续过滤组合产生异常显示
    if (!/^[\x00-\x7F]+$/.test(tag)) {
      tag = tag.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    }

    // Keep letters/numbers/safe symbols and all whitespace.
    // \p{L} = unicode letter, \p{N} = unicode number; replace with ASCII-equivalent range.
    tag = tag.replace(/[^A-Za-z\u00C0-\u024F\u1E00-\u1EFF0-9&+\-\/\s]/g, '')
    tag = tag.replace(/\s+/g, ' ').trim()
    if (!tag) tag = 'Benefit'

    // Title-case each word; keep short all-caps tokens like GTM.
    const tokens = tag.split(' ').filter(Boolean)
    const pretty = tokens
      .map((w) => {
        if (w.length <= 4 && /^[A-Z0-9]+$/.test(w)) return w
        return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w
      })
      .join(' ')

    return NextResponse.json({ tag: pretty.slice(0, 45) })
  } catch (e) {
    console.error('[analyze-benefit-tag]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : '分析失败' }, { status: 500 })
  }
}

