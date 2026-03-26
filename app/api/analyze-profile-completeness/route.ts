import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/analyze-profile-completeness
 * 分析用户 profile 缺什么，返回建议补充的提示（规则）
 * body: { oneSentenceDesc?: string, projects?: Array<{ text?: string; detail?: string; peopleNeeded?: unknown[]; stage?: string; whatToProvide?: string }>, workIntroductions?: unknown[] }
 * returns: { suggestions: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const oneSentenceDesc = typeof body?.oneSentenceDesc === 'string' ? body.oneSentenceDesc.trim() : ''
    const projects = Array.isArray(body?.projects) ? body.projects : []
    const workIntroductions = Array.isArray(body?.workIntroductions) ? body.workIntroductions : []

    const suggestions: string[] = []

    if (!oneSentenceDesc || oneSentenceDesc.length < 5) {
      suggestions.push('建议补充一句话自我介绍')
    }
    if (projects.length === 0) {
      suggestions.push('建议添加至少一个项目（Project）')
    } else {
      projects.forEach((p: { text?: string; detail?: string; peopleNeeded?: unknown[]; stage?: string; whatToProvide?: string }, i: number) => {
        const title = typeof p.text === 'string' ? p.text.trim() : ''
        const detail = typeof p.detail === 'string' ? p.detail.trim() : ''
        const need = Array.isArray(p.peopleNeeded) ? p.peopleNeeded.length : 0
        const stage = typeof p.stage === 'string' ? p.stage.trim() : ''
        const what = typeof p.whatToProvide === 'string' ? p.whatToProvide.trim() : ''
        if (title && (!detail || detail.length < 20)) suggestions.push(`项目「${title.slice(0, 12)}${title.length > 12 ? '…' : ''}」建议补充详情`)
        if (title && need === 0) suggestions.push(`项目「${title.slice(0, 12)}${title.length > 12 ? '…' : ''}」建议添加 Look for（需要什么人）`)
        if (title && !stage && !what) suggestions.push(`项目「${title.slice(0, 12)}${title.length > 12 ? '…' : ''}」建议填写进度或「要提供的内容」`)
      })
    }
    if (workIntroductions.length === 0 && projects.length > 0) {
      suggestions.push('建议补充工作/作品介绍（Work intro）')
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 6) })
  } catch (e) {
    console.error('[analyze-profile-completeness]', e)
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}
