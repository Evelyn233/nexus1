'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Sparkles, LayoutGrid, HeartHandshake, List, MessageCircle, Heart, Bookmark } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

type SquareItem = {
  userId: string
  userName: string | null
  profileSlug: string | null
  oneSentenceDesc?: string | null
  project: {
    text: string
    peopleNeeded: { text: string; detail?: string }[]
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

type TabId = 'feed' | 'collab'

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
  const [tab, setTab] = useState<TabId>('feed')
  const [needDetail, setNeedDetail] = useState<{ title: string; detail?: string; userName?: string | null; projectText?: string } | null>(null)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishText, setPublishText] = useState('')
  const [publishing, setPublishing] = useState(false)

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

  const loadFeed = async () => {
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
    const slug = item.profileSlug?.trim() || item.userName?.trim().toLowerCase().replace(/\s+/g, '')
    return `/u/${slug || item.userId}`
  }

  const displayItems: SquareItem[] = tab === 'collab'
    ? items.filter((item) => (item.project.peopleNeeded ?? []).length > 0)
    : items

  const handlePublish = () => {
    if (isAuthenticated) {
      setShowPublishModal(true)
      return
    }
    router.push(`/auth/signup?callbackUrl=${encodeURIComponent('/square')}`)
  }

  const handleSubmitPublish = async () => {
    const text = publishText.trim()
    if (!text || publishing) return
    setPublishing(true)
    try {
      const res = await fetch('/api/square/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.error || 'Publish failed')
        return
      }
      setShowPublishModal(false)
      setPublishText('')
      await loadFeed()
    } finally {
      setPublishing(false)
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
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200">
              <LayoutGrid className="w-4 h-4" />
              Plaza
            </span>
          </div>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'feed' ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <List className="w-4 h-4" />
            Your Feed
          </button>
          <button
            type="button"
            onClick={() => setTab('collab')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'collab' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            Collaboration Intent
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-pulse text-gray-400">Loading...</div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-16 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {tab === 'collab' ? 'No collaboration intents yet' : 'No public projects yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {tab === 'collab' ? 'Add people you\'re looking for when creating a Public activity to show here' : 'Mark projects as "Public" in your profile to show them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayItems.map((item, idx) => (
              <Link
                key={`${item.userId}-${item.project.createdAt}-${idx}`}
                href={profileLink(item)}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-teal-200/80 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <User className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="font-medium text-gray-900">{item.userName || 'Anonymous'}</span>
                      {item.oneSentenceDesc && (
                        <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{item.oneSentenceDesc}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatTime(item.project.createdAt)}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-teal-800 mb-1">{item.project.text}</p>
                  {(item.project.peopleNeeded ?? []).length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">I&apos;m looking for</p>
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
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-2">
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
              </Link>
            ))}
          </div>
        )}
        {tab === 'feed' && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={handlePublish}
              className="px-6 py-2.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
            >
              Publish
            </button>
          </div>
        )}
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
            <p className="text-xs text-gray-500 mb-1">{needDetail.userName || 'Anonymous'} · {needDetail.projectText}</p>
            <p className="text-sm font-medium text-amber-700 mb-2">{needDetail.title}</p>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {needDetail.detail?.trim() || 'No detail provided yet.'}
            </div>
          </div>
        </div>
      )}
      {showPublishModal && (
        <div className="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPublishModal(false)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Publish to Feed</h3>
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
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPublish}
                disabled={!publishText.trim() || publishing}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
              >
                {publishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
