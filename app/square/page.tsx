'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Sparkles, MessageCircle, Heart, Bookmark, LayoutGrid } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

const STAGE_RECOMMENDED = ['Idea', 'Planning'] as const

type PeopleNeededWithTags = { text: string; detail?: string; stageTag?: string; contentTag?: string }
type SquareItem = {
  userId: string
  userName: string | null
  profileSlug: string | null
  oneSentenceDesc?: string | null
  project: {
    text: string
    image?: string
    detail?: string
    references?: { type: 'link' | 'document'; title: string; url: string }[]
    peopleNeeded: PeopleNeededWithTags[]
    stage?: string
    stageOrder?: string[]
    stageEnteredAt?: Record<string, number>
    createdAt: number
    interaction: {
      likeCount: number
      favoriteCount: number
      commentCount: number
      myLiked: boolean
      myFavorited: boolean
      comments: { id: string; userId: string; userName?: string; text: string; createdAt: number }[]
    }
  }
}

type EngageDraft = {
  targetUserId: string
  projectCreatedAt: number
  targetName: string | null
  projectText: string
  peopleNeeded: PeopleNeededWithTags[]
}

type ProjectDetailView = {
  userName: string | null
  projectText: string
  detail?: string
  references?: { type: 'link' | 'document'; title: string; url: string }[]
  peopleNeeded: PeopleNeededWithTags[]
}

type NeedDetailView = {
  title: string
  detail?: string
  userName?: string | null
  projectText?: string
  stageTag?: string
  contentTag?: string
  stage?: string
  stageOrder?: string[]
  item: SquareItem | null
}

function inferContentTag(title: string, detail?: string): string | undefined {
  const t = (title + ' ' + (detail ?? '')).toLowerCase()
  if (/community|社区|社群/.test(t)) return '社区运营'
  if (/video|podcast|嘉宾|guest/.test(t)) return '内容嘉宾'
  if (/content|内容|创作|create/.test(t)) return '内容创作'
  if (/design|设计|build|搭建/.test(t)) return '设计搭建'
  if (/tech|技术|developer|开发/.test(t)) return '技术开发'
  if (/marketing|运营|growth/.test(t)) return '市场运营'
  if (/invest|投资|fund/.test(t)) return '投资'
  if (/experience|interested|collaborat|合作/.test(t)) return '协作'
  return undefined
}

function inferStageTag(title: string, detail?: string): string {
  const t = (title + ' ' + (detail ?? '')).toLowerCase()
  if (/co-founder|cofounder|founder|partner|planning|执行/.test(t)) return 'Planning'
  if (/feedback|idea|early|早期|想法/.test(t)) return 'Idea'
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

export default function SquarePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [items, setItems] = useState<SquareItem[]>([])
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
  const [engageSubmitting, setEngageSubmitting] = useState(false)

  const updateItemInteraction = (targetUserId: string, createdAt: number, interaction: SquareItem['project']['interaction']) => {
    setItems((prev) =>
      prev.map((item) =>
        item.userId === targetUserId && item.project.createdAt === createdAt
          ? { ...item, project: { ...item.project, interaction } }
          : item
      )
    )
  }

  const mutateInteraction = async (item: SquareItem, action: 'toggleLike' | 'toggleFavorite' | 'addComment', commentText?: string) => {
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

  const loadPlaza = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/square')
      const data = r.ok ? await r.json() : { items: [] }
      setItems(data.items ?? [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
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

  const profileLink = (item: SquareItem) => {
    // Plaza always links to public profile; editable profile is via header Profile link
    const slug = item.profileSlug?.trim() || item.userName?.trim().toLowerCase().replace(/\s+/g, '')
    return `/u/${slug || item.userId}`
  }

  const projectLink = (item: SquareItem) => {
    // Use actual userId (db id) so project API can reliably find user; profile page supports both id and slug
    return `/u/${item.userId}/project/${item.project.createdAt}`
  }

  const displayItems: SquareItem[] = items.filter((item) => (item.project.peopleNeeded ?? []).length > 0)

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
          body: JSON.stringify({
            imageData: publishImageData,
            filename: publishImageName || `square-${Date.now()}.jpg`,
          }),
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
      if (!res.ok) {
        alert(data?.error || 'Publish failed')
        return
      }
      setShowPublishModal(false)
      setPublishText('')
      setPublishImageData(null)
      setPublishImageName('')
      await loadPlaza()
    } finally {
      setPublishing(false)
    }
  }

  const openEngageModal = (item: SquareItem) => {
    const draft: EngageDraft = {
      targetUserId: item.userId,
      projectCreatedAt: item.project.createdAt,
      targetName: item.userName,
      projectText: item.project.text,
      peopleNeeded: item.project.peopleNeeded ?? [],
    }
    setEngageDraft(draft)
    setEngageContribution('')
    setShowEngageModal(true)
  }

  const submitEngageApplication = async () => {
    if (!engageDraft || !engageContribution.trim() || engageSubmitting) return
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
          contribution: engageContribution.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || 'Failed to send engage request')
        return
      }
      setShowEngageModal(false)
      setEngageDraft(null)
      setEngageContribution('')
      alert('Engage request sent to the project owner.')
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
            <Link
              href="/profile"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Profile
            </Link>
            <Link
              href="/square"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200"
            >
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
            <p className="text-gray-500">
              {'No collaboration intents yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {'Add people you\'re looking for when creating a Public activity to show here'}
            </p>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(projectLink(item))
                  }
                }}
              >
                <div
                  className="flex items-center justify-between gap-2 mb-2"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    router.push(profileLink(item))
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(profileLink(item))
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0 hover:opacity-80 cursor-pointer">
                    <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
                        <h3 className="text-sm font-semibold text-teal-800">{item.project.text}</h3>
                        <div
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-teal-500 bg-teal-500 text-white text-[9px] font-medium shrink-0"
                          title={(item.project.stage ?? '').trim() || 'Idea'}
                        >
                          <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>{(item.project.stage ?? '').trim() || 'Idea'}</span>
                        </div>
                      </div>
                    </>
                  ) : null}
                  {item.project.image ? (
                    <img
                      src={resolveImageUrl(item.project.image)}
                      alt="Published"
                      className="mt-1 w-full max-h-80 object-cover rounded-lg border border-gray-200"
                    />
                  ) : null}
                  {(item.project.peopleNeeded ?? []).length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Open to</p>
                      <div className="flex flex-wrap gap-1">
                        {(item.project.peopleNeeded ?? []).map((t, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setNeedDetail({
                                title: t.text,
                                detail: t.detail,
                                userName: item.userName,
                                projectText: item.project.text,
                                stageTag: t.stageTag,
                                contentTag: t.contentTag,
                                stage: item.project.stage,
                                stageOrder: item.project.stageOrder,
                                item,
                              })
                            }}
                            className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer"
                            title="Click to view details"
                          >
                            {t.text}
                          </button>
                        ))}
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
                          peopleNeeded: item.project.peopleNeeded ?? [],
                        })
                      }}
                      className="mt-2 inline-flex items-center px-2 py-1 rounded text-[10px] border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      View project details
                    </button>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void mutateInteraction(item, 'toggleLike')
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${item.project.interaction?.myLiked ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.project.interaction?.myLiked ? 'fill-current' : ''}`} />
                    {item.project.interaction?.likeCount ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void mutateInteraction(item, 'toggleFavorite')
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border ${item.project.interaction?.myFavorited ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${item.project.interaction?.myFavorited ? 'fill-current' : ''}`} />
                    {item.project.interaction?.favoriteCount ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const text = prompt('Write a comment')
                      if (!text?.trim()) return
                      void mutateInteraction(item, 'addComment', text.trim())
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {item.project.interaction?.commentCount ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!isAuthenticated) {
                        router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/square')}`)
                        return
                      }
                      openEngageModal(item)
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100"
                  >
                    Engage
                  </button>
                </div>
                {(item.project.interaction?.comments ?? []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(item.project.interaction.comments ?? []).slice(-2).map((c) => (
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
          <button
            type="button"
            onClick={handlePublish}
            className="px-6 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            Publish
          </button>
        </div>
      </main>
      {needDetail && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setNeedDetail(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Collaboration details</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setNeedDetail(null)}>
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              {needDetail.userName || 'Anonymous'} ·{' '}
              {needDetail.item ? (
                <Link href={projectLink(needDetail.item)} className="text-teal-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                  {needDetail.projectText}
                </Link>
              ) : (
                needDetail.projectText
              )}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <p className="text-sm font-medium text-amber-700">{needDetail.title}</p>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border-2 border-teal-500 bg-teal-500 text-white text-[10px] font-medium">
                <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                {needDetail.stageTag || needDetail.stage || (needDetail.stageOrder ?? [])[0] || inferStageTag(needDetail.title, needDetail.detail)}
              </span>
              {(needDetail.contentTag || inferContentTag(needDetail.title, needDetail.detail)) && (
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">
                  {needDetail.contentTag || inferContentTag(needDetail.title, needDetail.detail)}
                </span>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap mb-3">
              {needDetail.detail?.trim() || 'No detail provided yet.'}
            </div>
            {needDetail.item && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) {
                    setNeedDetail(null)
                    router.push(`/auth/signin?callbackUrl=${encodeURIComponent('/square')}`)
                    return
                  }
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
      {projectDetailView && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setProjectDetailView(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Project details</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setProjectDetailView(null)}>
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-1">{projectDetailView.userName || 'Anonymous'}</p>
            <p className="text-sm font-medium text-teal-800 mb-2">{projectDetailView.projectText || 'Project'}</p>
            {(projectDetailView.peopleNeeded ?? []).length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-gray-500 mb-1">Looking for</p>
                <div className="flex flex-wrap gap-1">
                  {projectDetailView.peopleNeeded.map((need, idx) => (
                    <span key={`${need.text}-${idx}`} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      {need.text}
                    </span>
                  ))}
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
                    <a
                      key={`${ref.url}-${idx}`}
                      href={ref.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1.5 hover:bg-gray-50"
                    >
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
      {showPublishModal && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPublishModal(false)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Publish to Plaza</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setShowPublishModal(false)}>
                ×
              </button>
            </div>
            <textarea
              value={publishText}
              onChange={(e) => setPublishText(e.target.value)}
              placeholder="Any idea..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
            <div className="mt-3">
              <label className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                Add image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : ''
                      setPublishImageData(result || null)
                      setPublishImageName(file.name)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              {publishImageData ? (
                <div className="mt-2">
                  <img
                    src={publishImageData}
                    alt="Preview"
                    className="w-full max-h-56 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPublishImageData(null)
                      setPublishImageName('')
                    }}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPublish}
                disabled={(!publishText.trim() && !publishImageData) || publishing}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showEngageModal && engageDraft && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowEngageModal(false)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Engage with project: {engageDraft.projectText || 'Project'}</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setShowEngageModal(false)}>
                ×
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              To: {engageDraft.targetName || 'Anonymous'}
            </p>
            {(engageDraft.peopleNeeded ?? []).length > 0 && (
              <div className="mb-2">
                <p className="text-[11px] text-gray-500 mb-1">This project is looking for</p>
                <div className="flex flex-wrap gap-1">
                  {(engageDraft.peopleNeeded ?? []).map((need, idx) => (
                    <span key={`${need.text}-${idx}`} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      {need.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <label className="block text-xs text-gray-600 mb-1">What do you want to contribute?</label>
            <textarea
              value={engageContribution}
              onChange={(e) => setEngageContribution(e.target.value)}
              placeholder="Share your role, skills, and the concrete value you can bring."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowEngageModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEngageApplication}
                disabled={!engageContribution.trim() || engageSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
              >
                {engageSubmitting ? 'Sending...' : 'Send Engage Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
