'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Sparkles, MessageCircle, Heart, Bookmark, LayoutGrid, Search } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ensureAbsoluteUrl } from '@/lib/ensureAbsoluteUrl'

// ── Types ──────────────────────────────────────────────────────
type LookForItem = {
  text: string
  detail?: string
  stageTag?: string
  contentTag?: string
  collabIntent?: string
  collabIntentLabel?: string
  image?: string
  workMode?: 'local' | 'remote'
  location?: string
}

type ProjectInfo = {
  text: string
  image?: string
  detail?: string
  references?: { type: 'link' | 'document'; title: string; url: string }[]
  stage?: string
  stageOrder?: string[]
  createdAt: number
  openStatusLabel?: string
  projectTypeTag?: string
  whatToProvide?: string
  peopleNeeded?: PeopleNeededWithTags[]
  allowEasyApply?: boolean
}

type PlazaItem = {
  userId: string
  userName: string | null
  profileSlug: string | null
  oneSentenceDesc?: string | null
  avatarDataUrl?: string | null
  lookFor: LookForItem
  project: ProjectInfo
  projectCreatedAt: number
  interaction: {
    likeCount: number
    favoriteCount: number
    commentCount: number
    myLiked: boolean
    myFavorited: boolean
    comments: { id: string; userId: string; userName?: string; text: string; createdAt: number }[]
  }
}

type EngageDraft = {
  targetUserId: string
  projectCreatedAt: number
  targetName: string | null
  projectText: string
  lookForText: string
}

type PeopleNeededWithTags = {
  text: string
  detail?: string
  stageTag?: string
  contentTag?: string
  collabIntent?: string
  collabIntentLabel?: string
  image?: string
  workMode?: 'local' | 'remote'
  location?: string
}

type ProjectDetailView = {
  userName: string | null
  projectText: string
  detail?: string
  references?: { type: 'link' | 'document'; title: string; url: string }[]
  lookFor?: LookForItem
}

type NeedDetailView = {
  title: string
  detail?: string
  userName?: string | null
  projectText?: string
  stageTag?: string
  contentTag?: string
  collabIntent?: string
  collabIntentLabel?: string
  image?: string
  stage?: string
  stageOrder?: string[]
  item: PlazaItem | null
}

// ── Helpers ────────────────────────────────────────────────────
function displayCollabLabel(intent?: string, label?: string): string | null {
  const v = intent?.trim()
  const lbl = label?.trim()
  if (!v) return (lbl && !lbl.startsWith('custom-')) ? lbl : null
  if (lbl && !lbl.startsWith('custom-')) return lbl
  if (v === 'guest') return 'Guest'
  if (v === 'partner') return 'Partner'
  if (v === 'part-time') return 'Part-time'
  if (v.startsWith('custom-')) return null
  return v
}

function displayStage(stage?: string, stageOrder?: string[]): string {
  const order = Array.isArray(stageOrder) ? stageOrder.filter((s) => typeof s === 'string' && s.trim().length > 0) : []
  if (order.length > 0) {
    if (stage && order.some((s) => s.toLowerCase() === stage.toLowerCase())) return stage
    return order[order.length - 1]
  }
  return (stage ?? '').trim() || 'Idea'
}

function inferContentTag(title: string, detail?: string): string | undefined {
  const t = (title + ' ' + (detail ?? '')).toLowerCase()
  if (/community|社区|社群/.test(t)) return 'Community'
  if (/video|podcast|嘉宾|guest/.test(t)) return 'Guest'
  if (/content|内容|创作|create/.test(t)) return 'Content'
  if (/design|设计|build|搭建/.test(t)) return 'Design'
  if (/tech|技术|developer|开发/.test(t)) return 'Tech'
  if (/marketing|运营|growth/.test(t)) return 'Marketing'
  if (/invest|投资|fund/.test(t)) return 'Investment'
  if (/experience|interested|collaborat|合作/.test(t)) return 'Collaboration'
  return undefined
}

function inferStageTag(title: string, detail?: string): string {
  const t = (title + ' ' + (detail ?? '')).toLowerCase()
  if (/co-founder|cofounder|founder|partner|planning/.test(t)) return 'Planning'
  if (/feedback|idea|early/.test(t)) return 'Idea'
  return 'Idea'
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

// ── Main Component ─────────────────────────────────────────────
export default function PlazaPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<PlazaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [needDetail, setNeedDetail] = useState<NeedDetailView | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishText, setPublishText] = useState('')
  const [publishImageData, setPublishImageData] = useState<string | null>(null)
  const [publishImageName, setPublishImageName] = useState<string>('')
  const [publishing, setPublishing] = useState(false)
  const [projectDetailView, setProjectDetailView] = useState<ProjectDetailView | null>(null)
  const [showEngageModal, setShowEngageModal] = useState(false)
  const [engageDraft, setEngageDraft] = useState<EngageDraft | null>(null)
  const [engageContribution, setEngageContribution] = useState('')
  const [engageEasyApplyUseProfile, setEngageEasyApplyUseProfile] = useState(false)
  const [engageResumeOrProfileUrl, setEngageResumeOrProfileUrl] = useState('')
  const [engageSubmitting, setEngageSubmitting] = useState(false)

  const updateItemInteraction = (targetUserId: string, createdAt: number, interaction: PlazaItem['interaction']) => {
    setItems((prev) =>
      prev.map((item) =>
        item.userId === targetUserId && item.project.createdAt === createdAt
          ? { ...item, interaction }
          : item
      )
    )
  }

  const mutateInteraction = async (item: PlazaItem, action: 'toggleLike' | 'toggleFavorite' | 'addComment', commentText?: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/square')}`)
      return
    }
    const res = await fetch('/api/square/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action,
        targetUserId: item.userId,
        projectCreatedAt: item.project.createdAt,
        text: commentText,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.interaction) {
      updateItemInteraction(item.userId, item.project.createdAt, data.interaction)
    } else if (data?.error) {
      alert(data.error)
    }
  }

  useEffect(() => {
    fetch('/api/square')
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((data) => {
        setItems(data.items ?? [])
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const profileLink = (item: PlazaItem) => {
    const slug = item.profileSlug?.trim() || item.userName?.trim().toLowerCase().replace(/\s+/g, '')
    return `/u/${slug || item.userId}`
  }

  const projectLink = (item: PlazaItem) => {
    return `/u/${item.userId}/project/${item.project.createdAt}`
  }

  const displayItems: PlazaItem[] = items.filter((item) => item.lookFor?.text)

  const handlePublish = () => {
    if (isAuthenticated) {
      setShowPublishModal(true)
      return
    }
    router.push(`/auth/signup?callbackUrl=${encodeURIComponent('/square')}`)
  }

  const handleSubmitPublish = async () => {
    const text = publishText.trim()
    if ((!text && !publishImageData) || publishing) return
    setPublishing(true)
    try {
      let image: string | undefined
      if (publishImageData) {
        const uploadRes = await fetch('/api/image/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: publishImageData, filename: publishImageName || `square-${Date.now()}.jpg` }),
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok || !uploadData?.url) {
          alert(uploadData?.error || 'Image upload failed')
          return
        }
        image = uploadData.url as string
      }
      const res = await fetch('/api/square/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, image }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data?.error || 'Publish failed'); return }
      setShowPublishModal(false)
      setPublishText('')
      setPublishImageData(null)
      setPublishImageName('')
      const r = await fetch('/api/square')
      const d = r.ok ? await r.json() : { items: [] }
      setItems(d.items ?? [])
    } finally {
      setPublishing(false)
    }
  }

  const openEngageModal = (item: PlazaItem) => {
    const draft: EngageDraft = {
      targetUserId: item.userId,
      projectCreatedAt: item.project.createdAt,
      targetName: item.userName,
      projectText: item.project.text,
      lookForText: item.lookFor?.text ?? item.project.text,
    }
    setEngageDraft(draft)
    setEngageContribution('')
    setShowEngageModal(true)
  }

  const engageModalItem = engageDraft
    ? items.find((i) => i.userId === engageDraft.targetUserId && i.project.createdAt === engageDraft.projectCreatedAt)
    : null
  const engageAllowEasyApply = !!engageModalItem?.project.allowEasyApply
  const canSubmitEngage = !!(
    engageDraft &&
    (engageContribution.trim() || (engageAllowEasyApply && (engageEasyApplyUseProfile || engageResumeOrProfileUrl.trim())))
  )

  const submitEngageApplication = async () => {
    if (!engageDraft || engageSubmitting) return
    if (!canSubmitEngage) return
    const isEasyApply = !!(engageAllowEasyApply && (engageEasyApplyUseProfile || engageResumeOrProfileUrl.trim()))
    setEngageSubmitting(true)
    try {
      const res = await fetch('/api/square/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'submit',
          targetUserId: engageDraft.targetUserId,
          projectCreatedAt: engageDraft.projectCreatedAt,
          contribution: engageContribution.trim() || (isEasyApply ? 'Easy Apply' : ''),
          ...(isEasyApply ? { easyApply: true, useMyProfile: !!engageEasyApplyUseProfile, resumeOrProfileUrl: engageResumeOrProfileUrl.trim() || undefined } : {}),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { alert(data?.error || 'Failed to send engage request'); return }
      setShowEngageModal(false)
      setEngageDraft(null)
      setEngageContribution('')
      setEngageEasyApplyUseProfile(false)
      setEngageResumeOrProfileUrl('')
      alert('Engage request sent.')
    } finally {
      setEngageSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 via-white to-teal-50/50">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo-nexus.jpeg"
              alt="Nexus"
              className="h-10 w-auto object-contain rounded-lg cursor-pointer hover:opacity-80"
              onClick={() => router.push('/profile')}
            />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors">
              Profile
            </Link>
            <Link href="/square" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200">
              <LayoutGrid className="w-4 h-4" />
              Plaza
            </Link>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-16 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No collaboration intents yet</p>
            <p className="text-xs text-gray-400 mt-1">Add people you're looking for when creating a Public activity to show here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayItems.map((item, idx) => (
              <div
                key={`${item.userId}-${item.project.createdAt}-${idx}`}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-teal-200/80 transition-all cursor-pointer"
                onClick={() => router.push(projectLink(item))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(projectLink(item)) } }}
              >
                <div
                  className="flex items-center justify-between gap-2 mb-2"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(profileLink(item)) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); router.push(profileLink(item)) } }}
                >
                  <div className="flex items-center gap-1.5 min-w-0 hover:opacity-80 cursor-pointer">
                    {item.avatarDataUrl ? (
                      <img src={resolveImageUrl(item.avatarDataUrl)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-teal-600" />
                      </div>
                    )}
                    <div className="min-w-0 flex items-baseline gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-gray-800">{item.userName || 'Anonymous'}</span>
                      {item.oneSentenceDesc && (
                        <span className="truncate text-[10px] text-gray-400">{item.oneSentenceDesc}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{formatTime(item.project.createdAt)}</span>
                </div>

                <div className="block">
                  {item.project.text ? (
                    <>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-bold text-teal-900">{item.project.text}</h3>
                        <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-teal-500 bg-teal-500 text-white text-[9px] font-medium shrink-0">
                          <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>{displayStage(item.project.stage, item.project.stageOrder)}</span>
                        </div>
                        {(item.project.openStatusLabel || item.lookFor?.text) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                            {item.project.openStatusLabel || 'Actively Hiring'}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const provideText = item.project.whatToProvide?.trim() || item.project.projectTypeTag || undefined
                        return provideText ? (
                          <div className="flex flex-col gap-1 mb-1.5">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-gray-500 shrink-0">Provide:</span>
                              <span className="text-[10px] text-cyan-700 font-medium">{provideText.length > 80 ? provideText.slice(0, 80) + '…' : provideText}</span>
                            </div>
                          </div>
                        ) : null
                      })()}
                      {item.project.detail?.trim() && (
                        <p className="text-[12px] text-gray-600 mt-0.5 line-clamp-2 leading-snug">
                          {item.project.detail.trim().length > 120 ? item.project.detail.trim().slice(0, 120) + '…' : item.project.detail.trim()}
                        </p>
                      )}
                    </>
                  ) : null}
                  {item.project.image ? (
                    <img src={resolveImageUrl(item.project.image)} alt="" className="mt-1 w-full max-h-80 object-cover rounded-lg border border-gray-200" />
                  ) : null}
                  {item.lookFor?.text && (
                    <div>
                      <p className="text-[14px] font-semibold text-gray-800 mb-1">Looking for</p>
                      <div className="flex flex-wrap gap-1">
                        <button
                          key={0}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setNeedDetail({
                              title: item.lookFor.text,
                              detail: item.lookFor.detail,
                              userName: item.userName,
                              projectText: item.project.text,
                              stageTag: item.lookFor.stageTag,
                              contentTag: item.lookFor.contentTag,
                              collabIntent: item.lookFor.collabIntent,
                              collabIntentLabel: item.lookFor.collabIntentLabel,
                              image: item.lookFor.image,
                              stage: item.project.stage,
                              stageOrder: item.project.stageOrder,
                              item,
                            })
                          }}
                          className="inline-flex flex-col items-start gap-1 px-2.5 py-1.5 rounded-lg text-left text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer max-w-full"
                        >
                          {item.lookFor.contentTag?.trim() ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[9px] font-medium shrink-0">
                              {item.lookFor.contentTag.trim()}
                            </span>
                          ) : null}
                          <span className="inline-flex flex-wrap items-center gap-1">
                            {(item.lookFor.workMode === 'local' || item.lookFor.workMode === 'remote') && (
                              <span className="text-[9px] font-medium text-amber-900/70 shrink-0">
                                {item.lookFor.workMode === 'local' && item.lookFor.location ? `Local · ${item.lookFor.location}` : item.lookFor.workMode === 'local' ? 'Local' : 'Remote'}
                              </span>
                            )}
                            {item.lookFor.image && <img src={resolveImageUrl(item.lookFor.image)} alt="" className="w-4 h-4 rounded object-cover shrink-0" />}
                            <span>{item.lookFor.text}</span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                  {(item.project.detail?.trim() || (item.project.references ?? []).length > 0) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setProjectDetailView({
                          userName: item.userName,
                          projectText: item.project.text,
                          detail: item.project.detail,
                          references: item.project.references,
                          lookFor: item.lookFor,
                        })
                      }}
                      className="mt-2 inline-flex items-center px-2 py-1 rounded text-[10px] border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      View project details
                    </button>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void mutateInteraction(item, 'toggleLike') }} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${item.interaction?.myLiked ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <Heart className={`w-3.5 h-3.5 ${item.interaction?.myLiked ? 'fill-current' : ''}`} />
                    {item.interaction?.likeCount ?? 0}
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); void mutateInteraction(item, 'toggleFavorite') }} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${item.interaction?.myFavorited ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    <Bookmark className={`w-3.5 h-3.5 ${item.interaction?.myFavorited ? 'fill-current' : ''}`} />
                    {item.interaction?.favoriteCount ?? 0}
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const text = prompt('Write a comment'); if (!text?.trim()) return; void mutateInteraction(item, 'addComment', text.trim()) }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-white text-gray-600 border-gray-200 hover:bg-gray-50">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {item.interaction?.commentCount ?? 0}
                  </button>
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isAuthenticated) { router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/square')}`); return }; openEngageModal(item) }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100">
                    Engage
                  </button>
                </div>
                {(item.interaction?.comments ?? []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(item.interaction.comments ?? []).slice(-2).map((c) => (
                      <div key={c.id} className="text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1 border border-gray-200">
                        <span className="font-medium text-gray-700">{c.userName || 'User'}:</span> {c.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 flex justify-center">
          <button type="button" onClick={handlePublish} className="px-6 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700">
            Publish
          </button>
        </div>
      </main>

      {/* Need Detail Modal */}
      {needDetail && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setNeedDetail(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Collaboration details</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setNeedDetail(null)}>×</button>
            </div>
            {needDetail.item ? (
              <Link
                href={profileLink(needDetail.item)}
                className="flex items-center gap-2 mb-2 rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-1.5 hover:bg-gray-100/80"
                onClick={(e) => e.stopPropagation()}
              >
                {needDetail.item.avatarDataUrl ? (
                  <img src={resolveImageUrl(needDetail.item.avatarDataUrl)} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-teal-600" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate">{needDetail.userName || 'Anonymous'}</p>
                  {needDetail.item.oneSentenceDesc?.trim() ? (
                    <p className="text-[10px] text-gray-500 line-clamp-2">{needDetail.item.oneSentenceDesc.trim()}</p>
                  ) : (
                    <p className="text-[10px] text-teal-600">View profile</p>
                  )}
                </div>
              </Link>
            ) : null}
            <p className="text-xs text-gray-500 mb-1">
              {needDetail.item ? (
                <>
                  <span className="text-gray-400">Project · </span>
                  <Link href={projectLink(needDetail.item)} className="text-teal-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                    {needDetail.projectText}
                  </Link>
                </>
              ) : (
                <>
                  {needDetail.userName || 'Anonymous'} · {needDetail.projectText}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {needDetail.image && (
                <img src={resolveImageUrl(needDetail.image)} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" />
              )}
              <p className="text-sm font-medium text-amber-700">{needDetail.title}</p>
              {displayCollabLabel(needDetail.collabIntent, needDetail.collabIntentLabel) && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                  Collaboration: {displayCollabLabel(needDetail.collabIntent, needDetail.collabIntentLabel)}
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border-2 border-teal-500 bg-teal-500 text-white text-[10px] font-medium">
                <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                {needDetail.stageTag || displayStage(needDetail.stage, needDetail.stageOrder)}
              </span>
              {(needDetail.contentTag || inferContentTag(needDetail.title, needDetail.detail)) && (
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                  {needDetail.contentTag || inferContentTag(needDetail.title, needDetail.detail)}
                </span>
              )}
            </div>
            {needDetail.item &&
              (needDetail.item.lookFor.workMode === 'local' || needDetail.item.lookFor.workMode === 'remote') && (
                <p className="text-[11px] text-gray-600 mb-2">
                  {needDetail.item.lookFor.workMode === 'local' && needDetail.item.lookFor.location
                    ? `Local · ${needDetail.item.lookFor.location}`
                    : needDetail.item.lookFor.workMode === 'local'
                      ? 'On-site / local collaboration'
                      : 'Remote collaboration'}
                </p>
              )}
            {needDetail.item &&
              !!(needDetail.item.project.whatToProvide?.trim() || needDetail.item.project.projectTypeTag) && (
                <div className="mb-2 rounded-lg border border-cyan-100 bg-cyan-50/50 px-2 py-1.5">
                  <p className="text-[10px] font-semibold text-cyan-900 mb-0.5">What they can offer</p>
                  <p className="text-xs text-cyan-800 whitespace-pre-wrap">
                    {(() => {
                      const t =
                        needDetail.item!.project.whatToProvide?.trim() ||
                        needDetail.item!.project.projectTypeTag ||
                        ''
                      return t.length > 400 ? `${t.slice(0, 400)}…` : t
                    })()}
                  </p>
                </div>
              )}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap mb-3">
              {(() => {
                const collab = needDetail.detail?.trim()
                const projectCtx = needDetail.item?.project.detail?.trim()
                if (collab && projectCtx && projectCtx !== collab) {
                  return (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">About this need</p>
                      <div className="mb-3">{collab}</div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Project context</p>
                      <div className="text-gray-700">{projectCtx}</div>
                    </div>
                  )
                }
                if (collab) return collab
                if (projectCtx) {
                  return (
                    <div>
                      <p className="text-[11px] text-gray-500 mb-2">
                        No long description for this collaboration need. Here is the project description for context.
                      </p>
                      <div>{projectCtx}</div>
                    </div>
                  )
                }
                return (
                  <div className="text-gray-500">
                    <p>No detail provided yet for this collaboration need.</p>
                    <p className="text-xs mt-2 text-gray-400">
                      You can open their project or profile, or tap Engage to ask for more specifics.
                    </p>
                  </div>
                )
              })()}
            </div>
            {(needDetail.item?.project.references ?? []).length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-gray-500 mb-1">Links / documents</p>
                <div className="space-y-1.5">
                  {(needDetail.item?.project.references ?? []).map((ref, idx) => (
                    <a
                      key={`${ref.url}-${idx}`}
                      href={ensureAbsoluteUrl(ref.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-800 truncate">{ref.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">{ref.url}</p>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${ref.type === 'document' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                      >
                        {ref.type === 'document' ? 'DOC' : 'LINK'}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {needDetail.item && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) { setNeedDetail(null); router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/square')}`); return }
                  setNeedDetail(null)
                  openEngageModal(needDetail.item!)
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700"
              >
                Engage
              </button>
            )}
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {projectDetailView && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setProjectDetailView(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Project details</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setProjectDetailView(null)}>×</button>
            </div>
            <p className="text-xs text-gray-500 mb-1">{projectDetailView.userName || 'Anonymous'}</p>
            <p className="text-sm font-medium text-teal-800 mb-2">{projectDetailView.projectText || 'Project'}</p>
            {projectDetailView.lookFor?.text && (
              <div className="mb-3">
                <p className="text-[11px] font-semibold text-gray-900 mb-1">Looking for</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex flex-col items-start gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    {(projectDetailView.lookFor.workMode === 'local' || projectDetailView.lookFor.workMode === 'remote') && (
                      <span className="text-[9px] font-medium text-gray-600">
                        {projectDetailView.lookFor.workMode === 'local' && projectDetailView.lookFor.location ? `Local · ${projectDetailView.lookFor.location}` : projectDetailView.lookFor.workMode === 'local' ? 'Local' : 'Remote'}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      {projectDetailView.lookFor.image && <img src={resolveImageUrl(projectDetailView.lookFor.image)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />}
                      {projectDetailView.lookFor.text}
                      {displayCollabLabel(projectDetailView.lookFor.collabIntent, projectDetailView.lookFor.collabIntentLabel) && (
                        <span className="text-amber-600">（{displayCollabLabel(projectDetailView.lookFor.collabIntent, projectDetailView.lookFor.collabIntentLabel)}）</span>
                      )}
                    </span>
                  </span>
                </div>
              </div>
            )}
            {projectDetailView.detail?.trim() && (
              <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {projectDetailView.detail}
              </div>
            )}
            {(projectDetailView.references ?? []).length > 0 && (
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Links / documents</p>
                <div className="space-y-1.5">
                  {(projectDetailView.references ?? []).map((ref, idx) => (
                    <a key={`${ref.url}-${idx}`} href={ensureAbsoluteUrl(ref.url)} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-800 truncate">{ref.title}</p>
                        <p className="text-[10px] text-gray-500 truncate">{ref.url}</p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${ref.type === 'document' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {ref.type === 'document' ? 'DOC' : 'LINK'}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPublishModal(false)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Publish to Plaza</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setShowPublishModal(false)}>×</button>
            </div>
            <textarea value={publishText} onChange={(e) => setPublishText(e.target.value)} placeholder="Any idea..." rows={4} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
            <div className="mt-3">
              <label className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                Add image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => { const result = typeof reader.result === 'string' ? reader.result : ''; setPublishImageData(result || null); setPublishImageName(file.name) }
                  reader.readAsDataURL(file)
                }} />
              </label>
              {publishImageData ? (
                <div className="mt-2">
                  <img src={publishImageData} alt="Preview" className="w-full max-h-56 object-cover rounded-lg border border-gray-200" />
                  <button type="button" onClick={() => { setPublishImageData(null); setPublishImageName('') }} className="mt-2 text-xs text-red-600 hover:underline">Remove image</button>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="button" onClick={handleSubmitPublish} disabled={(!publishText.trim() && !publishImageData) || publishing} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50">
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Engage Modal */}
      {showEngageModal && engageDraft && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowEngageModal(false)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Engage with project: {engageDraft.projectText || 'Project'}</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setShowEngageModal(false)}>×</button>
            </div>
            <p className="text-xs text-gray-500 mb-2">To: {engageDraft.targetName || 'Anonymous'}</p>
            {engageAllowEasyApply && (
              <div className="mb-3 p-3 rounded-lg border border-green-200 bg-green-50/50">
                <p className="text-xs font-medium text-gray-800 mb-2">Easy Apply</p>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input type="checkbox" checked={engageEasyApplyUseProfile} onChange={(e) => setEngageEasyApplyUseProfile(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-400" />
                  <span className="text-xs text-gray-700">Use my profile</span>
                </label>
                <input type="url" value={engageResumeOrProfileUrl} onChange={(e) => setEngageResumeOrProfileUrl(e.target.value)} placeholder="Or paste resume/profile URL" className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400/40" />
              </div>
            )}
            <label className="block text-xs text-gray-600 mb-1">What do you want to contribute?</label>
            <textarea value={engageContribution} onChange={(e) => setEngageContribution(e.target.value)} placeholder="Share your role, skills, and the concrete value you can bring." rows={4} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 mb-3" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowEngageModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="button" onClick={submitEngageApplication} disabled={!canSubmitEngage || engageSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50">
                {engageSubmitting ? 'Sending...' : 'Send Engage Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
