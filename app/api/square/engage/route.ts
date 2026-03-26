import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
const profileMessage = 'profileMessage' in prisma ? (prisma as unknown as { profileMessage: any }).profileMessage : undefined

type PeopleNeededItem = { text: string; detail?: string }
type ProjectItem = {
  text?: string
  createdAt?: number
  peopleNeeded?: Array<string | { text?: string; detail?: string }>
}

function extractPeopleNeeded(project: ProjectItem): PeopleNeededItem[] {
  const raw = Array.isArray(project.peopleNeeded) ? project.peopleNeeded : []
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        const text = item.trim()
        return text ? { text } : null
      }
      if (item && typeof item === 'object') {
        const text = String(item.text ?? '').trim()
        const detail = typeof item.detail === 'string' ? item.detail.trim() : ''
        if (!text) return null
        return { text, detail: detail || undefined }
      }
      return null
    })
    .filter((v): v is PeopleNeededItem => !!v)
}

function safeParseJson(input: string | null | undefined): Record<string, unknown> {
  if (!input) return {}
  try {
    return JSON.parse(input) as Record<string, unknown>
  } catch {
    return {}
  }
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0)
}

function cleanTagList(value: unknown): string[] {
  return Array.from(
    new Set(
      textList(value)
        .map((x) => x.replace(/\s+/g, ' ').trim())
        .filter((x) => x.length > 0)
    )
  ).slice(0, 8)
}

function fallbackTagsFromText(input: string): string[] {
  const lower = input.toLowerCase()
  const tags = new Set<string>()
  const rules: Array<{ keys: string[]; tag: string }> = [
    { keys: ['design', 'ui', 'ux', 'figma', 'brand'], tag: 'Design' },
    { keys: ['frontend', 'react', 'next', 'web'], tag: 'Frontend' },
    { keys: ['backend', 'api', 'server', 'database'], tag: 'Backend' },
    { keys: ['growth', 'market', 'user acquisition', 'community'], tag: 'Growth' },
    { keys: ['product', 'strategy', 'roadmap'], tag: 'Product Strategy' },
    { keys: ['video', 'content', 'editing', 'creator'], tag: 'Content' },
    { keys: ['ai', 'llm', 'prompt', 'rag'], tag: 'AI' },
    { keys: ['ops', 'automation', 'workflow'], tag: 'Operations' },
  ]
  for (const rule of rules) {
    if (rule.keys.some((k) => lower.includes(k))) tags.add(rule.tag)
  }
  if (tags.size === 0) tags.add('Collaboration')
  return Array.from(tags).slice(0, 6)
}

function fallbackContributionHint(context: { projectText: string; peopleNeeded: PeopleNeededItem[]; oneLine: string }): string {
  const need = context.peopleNeeded[0]?.text || 'this project'
  if (context.oneLine) {
    return `Based on my background (${context.oneLine}), I can contribute by helping with ${need} and delivering clear execution outcomes.`
  }
  return `I can contribute by helping with ${need}, sharing practical experience, and driving execution with clear deliverables.`
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const me = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, profileData: true, profileSlug: true },
    })
    if (!me?.id) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const { targetUserId, projectCreatedAt, contribution, mode, selectedTags, easyApply, useMyProfile, resumeOrProfileUrl } = body as {
      targetUserId?: string
      projectCreatedAt?: number
      contribution?: string
      mode?: 'draft' | 'suggest' | 'submit'
      selectedTags?: string[]
      easyApply?: boolean
      useMyProfile?: boolean
      resumeOrProfileUrl?: string
    }

    if (!targetUserId || typeof projectCreatedAt !== 'number') {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
    }
    const cleanContribution = (contribution || '').trim()

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, profileData: true },
    })
    if (!target) return NextResponse.json({ error: 'Target user not found' }, { status: 404 })

    const targetPd = safeParseJson(target.profileData ?? '')
    const projects = Array.isArray(targetPd.projects) ? (targetPd.projects as ProjectItem[]) : []
    const project = projects.find((p) => typeof p?.createdAt === 'number' && p.createdAt === projectCreatedAt)
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const projectText = typeof project.text === 'string' ? project.text.trim() : ''
    const peopleNeeded = extractPeopleNeeded(project)
    const allowEasyApply = (project as Record<string, unknown>).allowEasyApply === true

    const myPd = safeParseJson(me.profileData ?? '')
    const oneLine = typeof myPd.oneSentenceDesc === 'string' ? myPd.oneSentenceDesc.trim() : ''

    if (mode === 'draft') {
      const hint = fallbackContributionHint({
        projectText,
        peopleNeeded,
        oneLine,
      })

      return NextResponse.json({
        ok: true,
        hint,
        projectText,
        peopleNeeded,
      })
    }

    const isEasyApply = mode === 'submit' && !!easyApply
    if (isEasyApply && !allowEasyApply) {
      return NextResponse.json({ error: 'This project does not accept Easy Apply' }, { status: 400 })
    }
    const hasContribution = !!cleanContribution || isEasyApply
    if (!hasContribution && mode === 'submit') {
      return NextResponse.json({ error: 'Contribution or Easy Apply (profile/resume) is required' }, { status: 400 })
    }
    if (mode === 'submit' && !isEasyApply && !cleanContribution) {
      return NextResponse.json({ error: 'Contribution is required' }, { status: 400 })
    }

    if (mode === 'submit') {
      if (!profileMessage) {
        return NextResponse.json({ error: 'Profile messages not available' }, { status: 503 })
      }

      const finalTags = cleanTagList(selectedTags)
      const applicantProfileUrl =
        typeof useMyProfile === 'boolean' && useMyProfile && me.id
          ? `${process.env.NEXTAUTH_URL || 'https://nexus.com'}/u/${me.profileSlug && me.profileSlug.trim() ? me.profileSlug.trim() : me.id}`
          : undefined
      const resumeUrl = typeof resumeOrProfileUrl === 'string' && resumeOrProfileUrl.trim() ? resumeOrProfileUrl.trim() : undefined
      const payload = {
        kind: 'square_engage_application',
        projectCreatedAt,
        projectText,
        contribution: cleanContribution || (isEasyApply ? 'Easy Apply' : ''),
        tags: finalTags,
        applicant: {
          id: me.id,
          name: me.name || null,
          ...(applicantProfileUrl ? { profileUrl: applicantProfileUrl } : {}),
          ...(resumeUrl ? { resumeOrProfileUrl: resumeUrl } : {}),
        },
        ...(isEasyApply ? { easyApply: true, useMyProfile: !!useMyProfile } : {}),
        createdAt: new Date().toISOString(),
      }

      const summary = [
        '[ENGAGE_APPLICATION]',
        `Project: ${projectText || '(no title)'}`,
        `Contribution: ${cleanContribution}`,
        finalTags.length ? `Suggested tags: ${finalTags.join(', ')}` : '',
        `META:${JSON.stringify(payload)}`,
      ]
        .filter(Boolean)
        .join('\n')

      await profileMessage.create({
        data: {
          toUserId: targetUserId,
          fromUserId: me.id,
          text: summary,
        },
      })

      return NextResponse.json({
        ok: true,
        submitted: true,
        tags: finalTags,
      })
    }

    const suggestedTags = fallbackTagsFromText(
      `${cleanContribution}\n${projectText}\n${peopleNeeded.map((x) => x.text).join(' ')}`
    )

    return NextResponse.json({
      ok: true,
      tags: suggestedTags,
      projectText,
      peopleNeeded,
    })
  } catch (e) {
    console.error('[square/engage] POST failed:', e)
    return NextResponse.json({ error: 'Failed to suggest tags' }, { status: 500 })
  }
}

