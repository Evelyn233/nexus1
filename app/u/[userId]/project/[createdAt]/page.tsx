'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Share2, Heart, Bookmark, MessageCircle, ArrowLeft, LayoutGrid, Sparkles, LogOut, Pencil } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { ProjectEditor } from '@/components/ProjectEditor'
import { useAuth } from '@/hooks/useAuth'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ensureAbsoluteUrl } from '@/lib/ensureAbsoluteUrl'
import { acceptedSubmissionLabel, acceptedSubmissionsFromString } from '@/lib/acceptedSubmissions'
import { sanitizeBenefitTagDisplay } from '@/lib/displayStrings'

type ProjectData = {
  text: string
  detail?: string
  image?: string
  stage?: string
  stageOrder?: string[]
  stageEnteredAt?: Record<string, number>
  references?: ({ type?: 'link' | 'document'; title: string; url: string; cover?: string; description?: string; stageTag?: string; contentTag?: string; contributor?: string } | { type?: 'link' | 'document'; title: string; url: string; cover?: string; description?: string; stageTag?: string; contentTag?: string; contributor?: string })[]
  peopleNeeded: {
    text: string
    detail?: string
    stageTag?: string
    contentTag?: string
    collabIntent?: string
    acceptedSubmissions?: string
    recruiterQuestions?: string
    image?: string
    link?: string
    workMode?: 'local' | 'remote'
    location?: string
  }[]
  attachments?: { url: string; name: string; addedAt?: number; stageTag?: string; contentTag?: string }[]
  creators?: string[]
  createdAt: number
  projectTypeTag?: string
  /** Whether to publish on Plaza */
  showOnPlaza?: boolean
  /** Visibility */
  visibility?: 'individual' | 'public' | 'hidden'
  /** External status label, e.g. Actively Hiring */
  openStatusLabel?: string
  /** Whether to accept Easy Apply (one-click apply via resume/profile) */
  allowEasyApply?: boolean
  /** Service/product/content to provide */
  whatToProvide?: string
  /** What you can bring (displayed in English) */
  whatYouCanBring?: string
  /** AI summarized benefit tag (English) */
  whatYouCanBringTag?: string
  /** Culture & Benefit */
  cultureAndBenefit?: string
  /** Initiator/your role in this project (required) */
  initiatorRole?: string
  /** One sentence description (optional) */
  oneSentenceDesc?: string
}

type UserData = {
  id: string
  name: string | null
  image: string | null
  profileSlug: string
  oneSentenceDesc?: string | null
  avatarDataUrl?: string | null
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined })
}

function formatStageDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`
}

const INITIATOR_ROLE_LABELS: Record<string, string> = {
  initiator: '发起人 Initiator',
  'co-initiator': '联合发起 Co-initiator',
  'core-member': '核心成员 Core member',
  advisor: '顾问 Advisor',
  other: '其他 Other',
}
function initiatorRoleLabel(value: string | undefined): string {
  if (!value?.trim()) return '发起人 Initiator'
  return INITIATOR_ROLE_LABELS[value.trim()] ?? value
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, session } = useAuth()
  const userId = params.userId as string
  const createdAt = parseInt(params.createdAt as string, 10)

  const [project, setProject] = useState<ProjectData | null>(null)
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEngageModal, setShowEngageModal] = useState(false)
  const [engageContribution, setEngageContribution] = useState('')
  const [engageSubmitting, setEngageSubmitting] = useState(false)
  const [engageEasyApplyUseProfile, setEngageEasyApplyUseProfile] = useState(false)
  const [engageResumeOrProfileUrl, setEngageResumeOrProfileUrl] = useState('')
  const [peopleDetailModal, setPeopleDetailModal] = useState<{
    text: string
    detail?: string
    recruiterQuestions?: string
    workMode?: 'local' | 'remote'
    location?: string
  } | null>(null)
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState(false)
  /** Owner: true = edit mode (ProjectEditor), false = view mode (read-only) */
  const [editMode, setEditMode] = useState(false)

  const currentUserId = (session?.user as { id?: string })?.id
  const isOwner = !!(currentUserId && user?.id && currentUserId === user.id)

  const peopleNeededList = project?.peopleNeeded ?? []
  const lookingForCount = peopleNeededList.length
  const collabCounts = peopleNeededList.reduce<Record<string, number>>((acc, t) => {
    const intents = (t.collabIntent || '').split(',').map((s) => s.trim()).filter(Boolean)
    if (intents.length === 0) {
      acc['其他'] = (acc['其他'] ?? 0) + 1
      return acc
    }
    intents.forEach((value) => {
      const key = value === 'guest' ? '嘉宾' : value === 'partner' ? '合作伙伴' : value === 'part-time' ? '纯兼职' : value
      acc[key] = (acc[key] ?? 0) + 1
    })
    return acc
  }, {})
  /** Label counts above: grouped by "what to look for" content (contentTag or text abbreviation), only shows look-for attributes, without Partner etc. */
  const lookingForLabelCounts = (() => {
    const map = new Map<string, { display: string; count: number }>()
    const stripPartner = (s: string) => { const t = s.replace(/\s+Partner\s*$/i, '').trim(); return t || '其他' }
    peopleNeededList.forEach((t) => {
      const raw = (t.contentTag || (t.text || '').trim()).trim()
      let display = raw ? (raw.length > 32 ? raw.slice(0, 32) + '…' : raw) : '其他'
      display = stripPartner(display)
      const key = display.toLowerCase()
      const existing = map.get(key)
      if (existing) existing.count += 1
      else map.set(key, { display, count: 1 })
    })
    return Array.from(map.values())
  })()
  /** What kind of people needed — brief summary (from first or first two peopleNeeded.text) */
  const peopleNeededSummary =
    peopleNeededList.length > 0
      ? (() => {
          const first = (peopleNeededList[0].text || '').trim()
          if (first) return first.length > 60 ? first.slice(0, 60) + '…' : first
          const labels = Object.keys(collabCounts)
          return labels.length > 0 ? `Looking for: ${labels.join(', ')} etc.` : ''
        })()
      : ''
  /** Project nature: project type + domain tags from links/attachments (AI detected), no stage, no peopleNeeded contentTag */
  const projectNatureTags = (() => {
    const seen = new Set<string>()
    const tags: { label: string }[] = []
    const add = (label: string) => {
      const key = label.trim().toLowerCase()
      if (!key || seen.has(key)) return
      seen.add(key)
      tags.push({ label: label.trim() })
    }
    if (project?.projectTypeTag) add(project.projectTypeTag)
    ;(project?.references ?? []).forEach((r) => {
      if (r.contentTag) add(r.contentTag)
    })
    ;(project?.attachments ?? []).forEach((a) => {
      if (a.contentTag) add(a.contentTag)
    })
    return tags
  })()
  const firstLink = (project?.references ?? [])[0]?.url
  const shortDetail = project?.detail?.trim() ? (detailExpanded ? project.detail : project.detail.slice(0, 200)) : ''
  const showReadMore = (project?.detail?.trim()?.length ?? 0) > 200

  const loadProject = useCallback((options?: { bustCache?: boolean }) => {
    if (!userId || isNaN(createdAt)) return Promise.resolve()
    const url = `/api/project?userId=${encodeURIComponent(userId)}&createdAt=${createdAt}${options?.bustCache ? `&_t=${Date.now()}` : ''}`
    return fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && data?.project && data?.user) {
          setProject(data.project)
          setUser(data.user)
        }
      })
      .catch(() => {})
  }, [userId, createdAt])

  useEffect(() => {
    if (!userId || isNaN(createdAt)) {
      setLoading(false)
      return
    }
    let cancelled = false
    loadProject().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, createdAt, loadProject])

  // Fetch AI suggestions for "what's missing" when viewing project as owner
  useEffect(() => {
    if (!project || !user || !isOwner) {
      setAiSuggestions([])
      return
    }
    setAiSuggestionsLoading(true)
    fetch('/api/analyze-project-completeness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: {
          text: project.text,
          detail: project.detail,
          whatToProvide: project.whatToProvide,
          cultureAndBenefit: project.cultureAndBenefit,
          peopleNeeded: project.peopleNeeded,
          stage: project.stage,
          stageOrder: project.stageOrder,
          references: project.references,
          attachments: project.attachments,
          projectTypeTag: project.projectTypeTag,
        },
      }),
    })
      .then((r) => r.ok ? r.json() : { suggestions: [] })
      .then((data) => { setAiSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []) })
      .catch(() => setAiSuggestions([]))
      .finally(() => setAiSuggestionsLoading(false))
  }, [isOwner, project?.text, project?.detail, project?.whatToProvide, project?.cultureAndBenefit, project?.peopleNeeded?.length, project?.stage, project?.stageOrder?.length, project?.references?.length, project?.attachments?.length, project?.projectTypeTag])

  const handleEngage = () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}/project/${createdAt}`)}`)
      return
    }
    setShowEngageModal(true)
  }

  const canSubmitEngage = !!(
    engageContribution.trim() ||
    (project?.allowEasyApply && (engageEasyApplyUseProfile || engageResumeOrProfileUrl.trim()))
  )

  const submitEngage = async () => {
    if (!user?.id || engageSubmitting) return
    if (!canSubmitEngage) return
    setEngageSubmitting(true)
    const isEasyApply = !!(project?.allowEasyApply && (engageEasyApplyUseProfile || engageResumeOrProfileUrl.trim()))
    try {
      const res = await fetch('/api/square/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'submit',
          targetUserId: user.id,
          projectCreatedAt: createdAt,
          contribution: engageContribution.trim() || (isEasyApply ? 'Easy Apply' : ''),
          selectedTags: [],
          ...(isEasyApply ? {
            easyApply: true,
            useMyProfile: !!engageEasyApplyUseProfile,
            resumeOrProfileUrl: engageResumeOrProfileUrl.trim() || undefined,
          } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || 'Failed to send')
        return
      }
      setShowEngageModal(false)
      setPeopleDetailModal(null)
      setEngageContribution('')
      setEngageEasyApplyUseProfile(false)
      setEngageResumeOrProfileUrl('')
      alert('Engage request sent.')
    } finally {
      setEngageSubmitting(false)
    }
  }

  const profileLink = currentUserId && user?.id && currentUserId === user.id ? '/profile' : `/u/${userId}`

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-teal-50/50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!project || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-teal-50/50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Project not found</p>
        <Link href="/square" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700">
          Back to Plaza
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-teal-50/50">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <Link
            href="/square"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Plaza</span>
          </Link>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                type="button"
                onClick={() => setEditMode((e) => !e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                {editMode ? 'View' : 'Edit'}
              </button>
            )}
            <Link
              href={profileLink}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Profile
            </Link>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200">
              <LayoutGrid className="w-4 h-4" />
              Project
            </span>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {isOwner && (aiSuggestions.length > 0 || aiSuggestionsLoading) && !editMode && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
            <p className="text-[11px] font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              AI Suggestions: Recommended additions
            </p>
            {aiSuggestionsLoading ? (
              <p className="text-[11px] text-amber-700">Analyzing...</p>
            ) : (
              <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
                {aiSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-amber-600 mt-1.5">Click "Edit" to add the above content here</p>
          </div>
        )}
        {isOwner && editMode ? (
          <ProjectEditor
            project={{
              text: project.text,
              detail: project.detail,
              image: project.image,
              stage: project.stage,
              stageOrder: project.stageOrder,
              stageEnteredAt: project.stageEnteredAt,
              references: (project.references ?? []).map((r) => ({
                title: r.title || r.url || '',
                url: r.url,
                cover: r.cover,
                description: r.description,
                stageTag: r.stageTag,
                contentTag: r.contentTag,
              })),
              peopleNeeded: (project.peopleNeeded ?? []).map((p) => ({
                text: p.text,
                detail: p.detail,
                stageTag: p.stageTag,
                contentTag: p.contentTag,
                collabIntent: p.collabIntent,
                acceptedSubmissions: p.acceptedSubmissions,
                recruiterQuestions: p.recruiterQuestions,
                image: p.image,
                link: p.link,
                workMode: p.workMode,
                location: p.location,
              })),
              attachments: project.attachments,
              projectTypeTag: project.projectTypeTag,
              showOnPlaza: project.showOnPlaza,
              visibility: project.visibility,
              openStatusLabel: project.openStatusLabel,
              whatToProvide: project.whatToProvide,
              cultureAndBenefit: project.cultureAndBenefit,
              initiatorRole: project.initiatorRole,
              oneSentenceDesc: project.oneSentenceDesc,
            }}
            userId={user.id}
            createdAt={createdAt}
            userName={user.name ?? undefined}
            hasProfileAvatar={!!(user?.avatarDataUrl ?? user?.image)}
            onSaved={(updated) => {
              setProject((prev) => prev ? { ...prev, ...updated } : null)
              // After save, force fetch latest data to avoid stale content on public page / after switching to view mode (stage, whatToProvide, etc.)
              loadProject({ bustCache: true })
            }}
            onClose={() => setEditMode(false)}
          />
        ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* 1. Header: icon + title + status + one-sentence description + meta (Looking for N / update time) */}
          <div className="p-5 pb-3">
            <div className="flex gap-3">
              {project.image ? (
                <img src={resolveImageUrl(project.image)} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-200" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-teal-100 to-violet-100 flex items-center justify-center shrink-0 border border-gray-200">
                  <LayoutGrid className="w-7 h-7 text-teal-600" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold text-gray-900">{project.text}</h1>
                  {project.stage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      {project.stage}
                    </span>
                  )}
                  {project.openStatusLabel && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-medium">
                      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      {project.openStatusLabel}
                    </span>
                  )}
                </div>
                {project.oneSentenceDesc?.trim() && (
                  <p className="text-[13px] text-gray-600 mt-1">{project.oneSentenceDesc.trim()}</p>
                )}
                {shortDetail ? (
                  <p className="text-[13px] text-gray-600 mt-1 line-clamp-2">
                    {shortDetail}
                    {!detailExpanded && showReadMore && '...'}
                  </p>
                ) : null}
                {(project.whatToProvide?.trim() || project.projectTypeTag || lookingForLabelCounts.length > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {project.projectTypeTag && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[10px] font-medium">
                        {project.projectTypeTag}
                      </span>
                    )}
                    {project.whatToProvide?.trim() && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-medium max-w-[320px] truncate" title={project.whatToProvide.trim()}>
                        {project.whatToProvide.trim()}
                      </span>
                    )}
                    {lookingForLabelCounts.slice(0, 3).map(({ display, count }, idx) => (
                      <span key={`${display}-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium">
                        {display}{count > 1 ? ` (${count})` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  {lookingForCount > 0 ? `Looking for ${lookingForCount}` : null}
                  {lookingForCount > 0 && formatTime(project.createdAt) ? ' · ' : null}
                  {formatTime(project.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Attribute tags: rounded tag grid */}
          {/* Project nature: project type + domain/content tags (AI detected), no stage */}
          {projectNatureTags.length > 0 && (
            <div className="px-5 pb-3">
              <p className="text-[11px] font-semibold text-gray-900 mb-1.5">项目性质 / Nature of project</p>
              <div className="flex flex-wrap gap-2">
                {projectNatureTags.map((item, i) => (
                  <span
                    key={`${item.label}-${i}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-[12px] font-medium underline decoration-gray-400 underline-offset-2"
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 3. Website / Looking for count + long description (Read more) */}
          <div className="px-5 pb-4 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
              {firstLink && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-900 mb-0.5">Website</p>
                  <a href={ensureAbsoluteUrl(firstLink)} target="_blank" rel="noopener noreferrer" className="text-[12px] text-teal-600 hover:underline truncate block">
                    {firstLink}
                  </a>
                </div>
              )}
              {lookingForCount > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-900 mb-0.5">Looking for</p>
                  {lookingForLabelCounts.length > 0 ? (
                    <p className="text-[12px] text-gray-700 font-medium">
                      {lookingForLabelCounts.map(({ display, count }) => `${display} (${count})`).join(' · ')}
                    </p>
                  ) : (
                    <p className="text-[12px] text-gray-700">{lookingForCount} 项</p>
                  )}
                </div>
              )}
            </div>
            {project.detail?.trim() && (
              <div>
                <p className="text-[12px] text-gray-700 whitespace-pre-wrap">
                  {shortDetail}
                  {!detailExpanded && showReadMore ? '...' : ''}
                </p>
                {showReadMore && (
                  <button type="button" onClick={() => setDetailExpanded((e) => !e)} className="text-[12px] text-violet-600 hover:underline mt-0.5">
                    {detailExpanded ? '收起' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Service / Product / Content you want to provide：放在项目进度前面 */}
          {project.whatToProvide?.trim() && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-900 mb-1">Service / Product / Content you want to provide</p>
              <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{project.whatToProvide.trim()}</p>
            </div>
          )}

          {/* Culture & Benefit */}
          {project.cultureAndBenefit?.trim() && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-900 mb-1">Culture & Benefit</p>
              <p className="text-[12px] text-gray-700 whitespace-pre-wrap">{project.cultureAndBenefit.trim()}</p>
            </div>
          )}

          {/* 项目状态：放在 People 上面 */}
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-900 mb-2">项目状态</p>
            {(() => {
              const enteredAt = project.stageEnteredAt ?? {}
              const fromOrder = (project.stageOrder && project.stageOrder.length > 0) ? project.stageOrder : (project.stage ? [project.stage] : [])
              const allNames = Array.from(new Set([...fromOrder, ...Object.keys(enteredAt)])).filter(Boolean)
              const order = allNames.length > 0
                ? [...allNames].sort((a, b) => {
                    const ta = enteredAt[a] ?? Number.MAX_SAFE_INTEGER
                    const tb = enteredAt[b] ?? Number.MAX_SAFE_INTEGER
                    return ta - tb
                  })
                : (project.stage ? [project.stage] : ['Idea'])
              const currentStage = project.stage || order[order.length - 1] || order[0] || 'Idea'
              const currentIdx = order.findIndex((x) => x.toLowerCase() === currentStage.toLowerCase())
              const litCount = currentIdx >= 0 ? currentIdx + 1 : order.length
              return (
                <div className="flex flex-wrap items-center gap-y-1">
                  {order.map((s, idx) => {
                    const isLit = idx < litCount
                    const key = Object.keys(enteredAt).find((k) => k.toLowerCase() === s.toLowerCase()) ?? s
                    const ts = enteredAt[key] ?? (idx === 0 ? project.createdAt : undefined)
                    const showTime = ts != null
                    return (
                      <div key={`${s}-${idx}`} className="flex items-center">
                        <div className={showTime ? 'flex flex-col items-center shrink-0' : 'flex items-center'}>
                          <div
                            className={`inline-flex items-center justify-center gap-0.5 px-2.5 py-1 rounded-full border-2 ${
                              isLit ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-500'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLit ? 'bg-white' : 'bg-gray-300'}`} />
                            <span className="text-[11px] font-medium">{s}</span>
                          </div>
                          {showTime && (
                            <span className="text-[9px] text-gray-500 mt-1">
                              {formatStageDate(ts)}
                            </span>
                          )}
                        </div>
                        {idx < order.length - 1 && (
                          <div className={`w-4 h-0.5 shrink-0 mx-0.5 ${idx < litCount - 1 ? 'bg-teal-500' : 'bg-gray-200'}`} aria-hidden />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* People：卡片可点击，发起人跳个人页，合作者按姓名 slug 尝试跳转 */}
          {((project.creators ?? []).length > 0 || user.name) && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-900 mb-2">People</p>
              <div className="space-y-3">
                <Link
                  href={`/u/${encodeURIComponent(user.profileSlug || userId)}`}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-gray-900">{user.name || 'Anonymous'}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{initiatorRoleLabel(project.initiatorRole)}</p>
                    {(project.oneSentenceDesc?.trim() || user.oneSentenceDesc) && (
                      <p className="text-[11px] text-gray-600 mt-1 leading-snug">{project.oneSentenceDesc?.trim() || user.oneSentenceDesc}</p>
                    )}
                  </div>
                  {user.image ? (
                    <img src={resolveImageUrl(user.image)} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-gray-600 text-lg font-semibold">
                      {(user.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                {(project.creators ?? []).map((c, i) => {
                  const creatorSlug = (c || '').trim().toLowerCase().replace(/\s+/g, '')
                  return (
                    <Link
                      key={i}
                      href={creatorSlug ? `/u/${encodeURIComponent(creatorSlug)}` : '#'}
                      className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-gray-900">{c}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">合作者 Collaborator</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0 flex items-center justify-center text-gray-500 text-lg font-semibold">
                        {(c || '?').charAt(0).toUpperCase()}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Looking for：上面 = 标签性质（分类+数量），下面 = 详细卡片 */}
          {peopleNeededList.length > 0 && (
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[13px] font-bold text-gray-900 mb-2">Looking for</p>
              {/* 上面：标签 = 找什么内容 (数量)，如 go to market (1) */}
              {lookingForLabelCounts.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 mb-3 text-[12px] text-violet-900 font-medium">
                  {lookingForLabelCounts.map(({ display, count }) => (
                    <span key={display}>{display} ({count})</span>
                  ))}
                </div>
              )}
              {/* 下面：详细 - 每条找人卡片 */}
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">详细 Details</p>
              <div className="flex flex-wrap gap-1.5">
                {peopleNeededList.map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setPeopleDetailModal({
                        text: t.text,
                        detail: t.detail,
                        recruiterQuestions: t.recruiterQuestions,
                        workMode: t.workMode,
                        location: t.location,
                      })
                    }
                    className="inline-flex flex-col items-start gap-0.5 px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer text-left"
                  >
                    {(t.workMode === 'local' || t.workMode === 'remote') && (
                      <span className="text-[9px] font-medium text-gray-600">
                        {t.workMode === 'local' && t.location ? `Local · ${t.location}` : t.workMode === 'local' ? 'Local' : 'Remote'}
                      </span>
                    )}
                    <span className="text-[10px] font-medium inline-flex items-center gap-1 flex-wrap">
                      {t.image && <img src={resolveImageUrl(t.image)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                      {(t.collabIntent || '').split(',').map((s) => s.trim()).filter(Boolean).map((value) => (
                        <span key={value} className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 text-[9px] font-medium">
                          {value === 'guest' ? '嘉宾' : value === 'partner' ? '合作伙伴' : value === 'part-time' ? '纯兼职' : value}
                        </span>
                      ))}
                      {t.text}
                      {t.link && (
                        <a
                          href={ensureAbsoluteUrl(t.link)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-[9px] text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Link
                        </a>
                      )}
                    </span>
                    {(t.stageTag || t.contentTag || acceptedSubmissionsFromString(t.acceptedSubmissions).length > 0) && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {t.stageTag ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-[9px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            {t.stageTag}
                          </span>
                        ) : null}
                        {t.contentTag ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium">
                            {t.contentTag}
                          </span>
                        ) : null}
                        {acceptedSubmissionsFromString(t.acceptedSubmissions).map((v) => (
                          <span
                            key={v}
                            className="px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-[9px] font-medium"
                            title="接受的投递"
                          >
                            {acceptedSubmissionLabel(v)}
                          </span>
                        ))}
                      </div>
                    )}

                    {sanitizeBenefitTagDisplay(project?.whatYouCanBringTag) ? (
                      <div className="mt-0.5 max-w-full">
                        <span className="inline-block max-w-full px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 text-[11px] font-semibold leading-normal break-words">
                          {sanitizeBenefitTagDisplay(project.whatYouCanBringTag)}
                        </span>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() =>
                    peopleNeededList[0] &&
                    setPeopleDetailModal({
                      text: peopleNeededList[0].text,
                      detail: peopleNeededList[0].detail,
                      recruiterQuestions: peopleNeededList[0].recruiterQuestions,
                      workMode: peopleNeededList[0].workMode,
                      location: peopleNeededList[0].location,
                    })
                  }
                  className="text-[12px] text-violet-600 hover:underline"
                >
                  View all {lookingForCount} looking for at {project.text}
                </button>
              </p>
            </div>
          )}

          {project.image && (
            <div className="px-5 pb-3">
              <img src={resolveImageUrl(project.image)} alt="" className="w-full max-h-80 object-cover rounded-lg border border-gray-200" />
            </div>
          )}

          {(project.references ?? []).length > 0 && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-900 mb-2">Links</p>
              <div className="space-y-2">
                {(project.references ?? []).map((ref, i) => (
                  <a
                    key={i}
                    href={ensureAbsoluteUrl(ref.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    {ref.cover ? (
                      <img src={resolveImageUrl(ref.cover)} alt="" className="w-12 h-12 rounded object-cover shrink-0 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 shrink-0 flex items-center justify-center text-gray-400 text-[10px]">
                        {ref.type === 'document' ? 'DOC' : 'LINK'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-gray-800 block truncate">{ref.title}</span>
                      <span className="text-[10px] text-gray-500 truncate block">{ref.url}</span>
                      {ref.description && <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2">{ref.description}</p>}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {ref.stageTag ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-[9px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            {ref.stageTag}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[9px]">节点 —</span>
                        )}
                        {ref.contentTag ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium">{ref.contentTag}</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[9px]">tag —</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${ref.type === 'document' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {ref.type === 'document' ? 'DOC' : 'LINK'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {(project.attachments ?? []).length > 0 && (
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-[11px] font-semibold text-gray-900 mb-2">Attachments</p>
              <div className="space-y-1">
                {(project.attachments ?? []).map((a, i) => (
                  <a
                    key={i}
                    href={resolveImageUrl(a.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] text-gray-800 truncate block">{a.name}</span>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {a.stageTag ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-[9px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            {a.stageTag}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[9px]">节点 —</span>
                        )}
                        {a.contentTag ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium">{a.contentTag}</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[9px]">tag —</span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 shrink-0">FILE</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
            <Link href={profileLink} className="flex items-center gap-1.5 min-w-0 hover:opacity-80">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate text-[13px] font-semibold text-gray-800">{user.name || 'Anonymous'}</span>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}/project/${createdAt}`)}`)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <Heart className="w-3.5 h-3.5" />
              0
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <Bookmark className="w-3.5 h-3.5" />
              0
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              0
            </button>
            <button
              type="button"
              onClick={handleEngage}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
            >
              Engage
            </button>
            </div>
          </div>
        </div>
        )}
      </main>

      {peopleDetailModal && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setPeopleDetailModal(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Looking for</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setPeopleDetailModal(null)}>×</button>
            </div>
            <p className="text-sm font-medium text-amber-800 mb-1">{peopleDetailModal.text}</p>
            {(peopleDetailModal.workMode === 'local' || peopleDetailModal.workMode === 'remote') && (
              <p className="text-[12px] text-gray-700 mb-2">
                <span className="font-semibold text-gray-800">协作方式 · Work mode：</span>
                {peopleDetailModal.workMode === 'remote'
                  ? '远程 Remote'
                  : peopleDetailModal.location?.trim()
                    ? `在地 Local · ${peopleDetailModal.location.trim()}`
                    : '在地 Local'}
              </p>
            )}
            {peopleDetailModal.detail?.trim() && (
              <p className="text-xs text-gray-600 mb-4 whitespace-pre-wrap">{peopleDetailModal.detail}</p>
            )}
            {peopleDetailModal.recruiterQuestions?.trim() && (
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/80 px-3 py-2">
                <p className="text-[10px] font-semibold text-sky-900 mb-1">对方希望你回答的问题</p>
                <p className="text-xs text-sky-950 whitespace-pre-wrap">{peopleDetailModal.recruiterQuestions.trim()}</p>
              </div>
            )}
            <div className="mb-3">
              <p className="text-xs text-gray-700 font-medium">
                What benefit can you bring to them
              </p>
                  {project?.whatYouCanBring?.trim() ? (
                    <p className="text-[12px] text-gray-800 mt-1 whitespace-pre-wrap">
                      {project.whatYouCanBring.trim()}
                    </p>
                  ) : null}
              {sanitizeBenefitTagDisplay(project?.whatYouCanBringTag) && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="inline-block max-w-full px-2 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold leading-normal break-words">
                    {sanitizeBenefitTagDisplay(project.whatYouCanBringTag)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPeopleDetailModal(null)
                  handleEngage()
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                Engage
              </button>
              <button type="button" onClick={() => setPeopleDetailModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {showEngageModal && (
        <div className="fixed inset-0 z-[21] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowEngageModal(false)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Engage with: {project.text}</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => { setShowEngageModal(false); setPeopleDetailModal(null) }}>×</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">To: {user.name || 'Anonymous'}</p>
            {project.allowEasyApply && (
              <div className="mb-3 p-3 rounded-lg border border-green-200 bg-green-50/50">
                <p className="text-xs font-medium text-gray-800 mb-2">Easy Apply</p>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={engageEasyApplyUseProfile}
                    onChange={(e) => setEngageEasyApplyUseProfile(e.target.checked)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-400"
                  />
                  <span className="text-xs text-gray-700">使用我的个人主页</span>
                </label>
                <input
                  type="url"
                  value={engageResumeOrProfileUrl}
                  onChange={(e) => setEngageResumeOrProfileUrl(e.target.value)}
                  placeholder="或粘贴简历/个人主页链接"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400/40"
                />
              </div>
            )}
            <label className="block text-sm font-medium text-gray-800 mb-1">
              What benefit can you bring to them
            </label>
            <textarea
              value={engageContribution}
              onChange={(e) => setEngageContribution(e.target.value)}
              placeholder="Write what benefit you can bring to them..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowEngageModal(false); setPeopleDetailModal(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                type="button"
                onClick={submitEngage}
                disabled={!canSubmitEngage || engageSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
              >
                {engageSubmitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
