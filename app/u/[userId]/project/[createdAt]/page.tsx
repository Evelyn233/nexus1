'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { User, Share2, Heart, Bookmark, MessageCircle, ArrowLeft, LayoutGrid } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

type ProjectData = {
  text: string
  detail?: string
  image?: string
  stage?: string
  stageOrder?: string[]
  stageEnteredAt?: Record<string, number>
  references?: { type: 'link' | 'document'; title: string; url: string; cover?: string; stageTag?: string; contentTag?: string }[]
  peopleNeeded: { text: string; detail?: string; stageTag?: string; contentTag?: string }[]
  attachments?: { url: string; name: string; addedAt?: number; stageTag?: string; contentTag?: string }[]
  creators?: string[]
  createdAt: number
}

type UserData = {
  id: string
  name: string | null
  image: string | null
  profileSlug: string
  oneSentenceDesc?: string | null
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
  const [peopleDetailModal, setPeopleDetailModal] = useState<{ text: string; detail?: string } | null>(null)

  useEffect(() => {
    if (!userId || isNaN(createdAt)) {
      setLoading(false)
      return
    }
    let cancelled = false
    fetch(`/api/project?userId=${encodeURIComponent(userId)}&createdAt=${createdAt}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.success && data?.project && data?.user) {
          setProject(data.project)
          setUser(data.user)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, createdAt])

  const handleEngage = () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}/project/${createdAt}`)}`)
      return
    }
    setShowEngageModal(true)
  }

  const submitEngage = async () => {
    if (!user?.id || !engageContribution.trim() || engageSubmitting) return
    setEngageSubmitting(true)
    try {
      const res = await fetch('/api/square/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'submit',
          targetUserId: user.id,
          projectCreatedAt: createdAt,
          contribution: engageContribution.trim(),
          selectedTags: [],
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
      alert('Engage request sent.')
    } finally {
      setEngageSubmitting(false)
    }
  }

  const currentUserId = (session?.user as { id?: string })?.id
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-base font-semibold text-teal-800 mb-3">{project.text}</h1>

          <div className="flex items-center justify-between gap-2 mb-4">
            <Link href={profileLink} className="flex items-center gap-1.5 min-w-0 hover:opacity-80">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-gray-800">{user.name || 'Anonymous'}</span>
                {user.oneSentenceDesc && (
                  <span className="block truncate text-[11px] text-gray-500">{user.oneSentenceDesc}</span>
                )}
              </div>
            </Link>
            <span className="text-[10px] text-gray-400 shrink-0">{formatTime(project.createdAt)}</span>
          </div>

          {/* 进度节点：项目整体 */}
          <div className="mb-4 rounded-lg border-2 border-teal-200 bg-teal-50/50 px-4 py-3">
            <p className="text-[10px] text-teal-700 font-medium mb-2">进度节点 Progress</p>
            {(() => {
              const fullOrder = (project.stageOrder && project.stageOrder.length > 0) ? project.stageOrder : (project.stage ? [project.stage] : ['Idea'])
              const order = fullOrder.length > 0 ? fullOrder : ['Idea']
              const currentStage = project.stage || order[0] || 'Idea'
              const currentIdx = order.findIndex((x) => x.toLowerCase() === currentStage.toLowerCase())
              const litCount = currentIdx >= 0 ? currentIdx + 1 : 1
              const visibleOrder = order.slice(0, litCount)
              const enteredAt = project.stageEnteredAt ?? {}
              return (
                <div className="flex flex-wrap items-center gap-y-1">
                  {visibleOrder.map((s, idx) => {
                    const isLit = true
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
                        {idx < visibleOrder.length - 1 && (
                          <div className="w-4 h-0.5 shrink-0 mx-0.5 bg-teal-500" aria-hidden />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {((project.creators ?? []).length > 0 || user.name) && (
            <div className="mb-3 rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-2">
              <p className="text-[10px] text-teal-700 font-medium mb-1">主创 Creators</p>
              <p className="text-[9px] text-gray-500 mb-1">发起人与已邀请的合作者 Initiator and invited collaborators</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800 border border-teal-200">
                  {user.name || 'Anonymous'} (发起人 Initiator)
                </span>
                {(project.creators ?? []).map((c, i) => (
                  <span key={i} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-800 border border-teal-200">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(project.peopleNeeded ?? []).length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 mb-1">Open to</p>
              <div className="flex flex-wrap gap-1.5">
                {(project.peopleNeeded ?? []).map((t, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPeopleDetailModal({ text: t.text, detail: t.detail })}
                    className="inline-flex flex-col items-start gap-0.5 px-2 py-1 rounded-lg text-left bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 cursor-pointer"
                  >
                    <span className="text-[10px] font-medium">{t.text}</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {t.stageTag ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-[9px] font-medium">{t.stageTag}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[9px]">节点 —</span>
                      )}
                      {t.contentTag ? (
                        <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium">{t.contentTag}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[9px]">tag —</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {project.image && (
            <img
              src={resolveImageUrl(project.image)}
              alt=""
              className="w-full max-h-80 object-cover rounded-lg border border-gray-200 mb-3"
            />
          )}

          {project.detail?.trim() && (
            <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {project.detail}
            </div>
          )}

          {(project.references ?? []).length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 mb-1">Links</p>
              <div className="space-y-2">
                {(project.references ?? []).map((ref, i) => (
                  <a
                    key={i}
                    href={ref.url}
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
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {ref.stageTag ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-[9px] font-medium">{ref.stageTag}</span>
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
            <div className="mb-3">
              <p className="text-[10px] text-gray-500 mb-1">Attachments</p>
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
                          <span className="px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 text-[9px] font-medium">{a.stageTag}</span>
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

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
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
      </main>

      {peopleDetailModal && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setPeopleDetailModal(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Looking for</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setPeopleDetailModal(null)}>×</button>
            </div>
            <p className="text-sm font-medium text-amber-800 mb-1">{peopleDetailModal.text}</p>
            {peopleDetailModal.detail?.trim() && (
              <p className="text-xs text-gray-600 mb-4 whitespace-pre-wrap">{peopleDetailModal.detail}</p>
            )}
            <p className="text-xs text-gray-500 mb-3">What can you provide? Share your role, skills, or the concrete value you can bring.</p>
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
            <label className="block text-sm font-medium text-gray-800 mb-1">What can you provide?</label>
            <p className="text-xs text-gray-500 mb-2">Share your role, skills, or the concrete value you can bring.</p>
            <textarea
              value={engageContribution}
              onChange={(e) => setEngageContribution(e.target.value)}
              placeholder="e.g. I can help with video editing, community building, or content strategy..."
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-400/40 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowEngageModal(false); setPeopleDetailModal(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                type="button"
                onClick={submitEngage}
                disabled={!engageContribution.trim() || engageSubmitting}
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
