import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/analyze-stage-needs-link
 * 判断某个进度名称是否通常需要附带链接（如网页上线→需要网页链接），用于添加进度时要求用户补全链接
 * body: { stageName: string }
 * returns: { needsLink: boolean, linkType?: 'webpage' | 'document' | 'generic', message?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const stageName = typeof body?.stageName === 'string' ? body.stageName.trim() : ''
    if (!stageName) {
      return NextResponse.json({ error: '缺少进度名称' }, { status: 400 })
    }

    const apiKey = process.env.DEEPSEEK_API_KEY || ''
    if (!apiKey) {
      // 无 LLM 时用简单规则：含 上线/发布/Launch/上线/网页 等则需要网页链接
      const lower = stageName.toLowerCase()
      const needsWebpage = /上线|发布|launch|上线|网页|website|live|url|链接|link|上线|公开|publish|release|deploy/i.test(stageName) || /\bweb\b|网页/.test(lower)
      return NextResponse.json({
        needsLink: needsWebpage,
        linkType: needsWebpage ? 'webpage' as const : undefined,
        message: needsWebpage ? '此进度建议添加网页链接' : undefined,
      })
    }

    const systemPrompt = `你是一个项目进度助手。用户会输入一个「进度」名称（如 Idea、Planning、网页上线、Launch、发布等）。
请判断：这个进度是否通常需要用户附上一个链接才能算完整？

例如：
- 网页上线、上线、Launch、产品上线、发布、Website Live、Deploy、上线 → 需要网页链接 (needsLink: true, linkType: "webpage")
- 设计稿、Prototype、Demo、脚本、文档 → 可选文档/链接 (needsLink: false 或 true linkType: "document"，这里统一为需要时再要求)
- Idea、Planning、Research、Draft、拍摄、剪辑 → 一般不需要必填链接 (needsLink: false)

只返回 JSON：{"needsLink": true 或 false, "linkType": "webpage" 或 "document" 或 "generic" 或省略, "message": "简短说明"}`

    const userPrompt = `进度名称：${stageName}\n\n是否需要用户必须提供链接？只返回 JSON。`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

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
      let needsLink = false
      let linkType: 'webpage' | 'document' | 'generic' | undefined
      let message: string | undefined
      try {
        const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
        const parsed = JSON.parse(cleaned)
        needsLink = !!parsed?.needsLink
        if (parsed?.linkType === 'webpage' || parsed?.linkType === 'document' || parsed?.linkType === 'generic') {
          linkType = parsed.linkType
        }
        if (typeof parsed?.message === 'string' && parsed.message.trim()) {
          message = parsed.message.trim().slice(0, 80)
        }
      } catch {
        const lower = stageName.toLowerCase()
        if (/上线|发布|launch|网页|website|live|publish|release|deploy/i.test(stageName)) {
          needsLink = true
          linkType = 'webpage'
          message = '此进度建议添加网页链接'
        }
      }

      return NextResponse.json({ needsLink, linkType, message })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        const lower = stageName.toLowerCase()
        const needsWebpage = /上线|发布|launch|网页|website|live|publish|release|deploy/i.test(stageName)
        return NextResponse.json({
          needsLink: needsWebpage,
          linkType: needsWebpage ? 'webpage' as const : undefined,
          message: needsWebpage ? '此进度建议添加网页链接' : undefined,
        })
      }
      throw fetchErr
    }
  } catch (e) {
    console.error('[analyze-stage-needs-link]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '识别失败', needsLink: false },
      { status: 500 }
    )
  }
}
