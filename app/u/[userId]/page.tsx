'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Share2, Image as ImageIcon, MessageSquare, Send, Database, Lightbulb, Link2, ChevronRight, X, Heart, Briefcase, GraduationCap } from 'lucide-react'
import ProfileQADrawer from '@/components/ProfileQADrawer'
import { getPlatformByKey } from '@/lib/socialPlatforms'
import { useAuth } from '@/hooks/useAuth'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const userId = params.userId as string

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{
    oneSentenceDesc?: string | null
    avatarDataUrl?: string | null
    tags?: string[]
    headline?: string | null
    bio?: string | null
    myLink?: string | null
    projects?: { text: string; peopleNeeded?: string[] }[] | null
    collaborationPossibility?: string | string[] | null
    peopleToCollaborateWith?: string | string[] | null
    howToEngageMeOnline?: string | null
    howToEngageMeOffline?: string | null
    socialLinks?: Record<string, string>
    customLinks?: { title?: string; url: string }[]
    workIntroductions?: { id: string; cover?: string; name: string; description?: string; url?: string }[]
    experiences?: { id: string; title: string; company: string; employmentType?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }[]
    education?: { id: string; school: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }[]
    qaList?: { question: string; answer: string }[]
  }>({})
  const [publishedContents, setPublishedContents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false)
  const [qaInitialPrompt, setQaInitialPrompt] = useState(' ')
  const [dbQuery, setDbQuery] = useState('')
  const [dbQueryLoading, setDbQueryLoading] = useState(false)
  const [dbQueryResult, setDbQueryResult] = useState<string | null>(null)
  const [dbQueryError, setDbQueryError] = useState<string | null>(null)
  const [dbSuggestSendMessage, setDbSuggestSendMessage] = useState(false)
  const [sendMessageModalOpen, setSendMessageModalOpen] = useState(false)
  const [sendMessageModalText, setSendMessageModalText] = useState('')
  const [sendMessageModalStatus, setSendMessageModalStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(`${window.location.origin}/u/${userId}`)
    }
  }, [userId])

  // 获取当前用户是否已收藏此名片
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    fetch('/api/user/favorites', { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.favorites) {
          setIsFavorited(data.favorites.some((f: { userId: string }) => f.userId === user.id))
        }
      })
      .catch(() => {})
  }, [isAuthenticated, user?.id])

  // 从登录页返回时恢复之前输入的查询内容（login 会 strip callbackUrl 的 query，故用 localStorage）
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const dbKey = `profile_pending_db_query_${userId}`
      const q = localStorage.getItem(dbKey)
      if (q) {
        setDbQuery(q)
        localStorage.removeItem(dbKey)
      }
    } catch {}
  }, [userId])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/user/${userId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load profile')
        }

        const data = await response.json()
        if (data.success) {
          setUser(data.user)
          setProfile(data.profile || {})
          setPublishedContents(data.publishedContents || [])
          // 访问他人 profile 时立即加入「看过的」列表（无论是否登录），后续 GlobalChatDialog 会更新 hint
          try {
            const u = data.user
            const targetName = u?.name ?? null
            const key = 'profile_viewed_potential'
            const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null
            const list: { targetUserId: string; targetName?: string; hint: string; possibleTopics?: string[]; viewedAt: string }[] = raw ? JSON.parse(raw) : []
            const existing = list.findIndex((x) => x.targetUserId === userId)
            const placeholder = 'Chat with them and explore collaboration'
            const viewedAt = new Date().toISOString()
            if (existing >= 0) {
              list[existing] = { ...list[existing], targetName: targetName ?? list[existing].targetName, viewedAt }
            } else {
              list.unshift({ targetUserId: userId, targetName: targetName ?? undefined, hint: placeholder, possibleTopics: [], viewedAt })
            }
            if (typeof window !== 'undefined') {
              localStorage.setItem(key, JSON.stringify(list.slice(0, 50)))
              window.dispatchEvent(new CustomEvent('potentialConnection:updated'))
            }
          } catch (_) {}
        }
      } catch (error) {
        console.error('❌ [PUBLIC-PROFILE] 加载失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadProfile()
    }
  }, [userId])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    alert('Profile link copied to clipboard!')
  }

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}`)}`)
      return
    }
    if (!user?.id || favoriteLoading) return
    setFavoriteLoading(true)
    try {
      const action = isFavorited ? 'remove' : 'add'
      const res = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          userId: user.id,
          name: user.name,
          avatar: profile.avatarDataUrl || user.image,
          profileSlug: (user as { profileSlug?: string | null }).profileSlug,
          oneSentenceDesc: profile.oneSentenceDesc || profile.headline
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setIsFavorited(!isFavorited)
      }
    } catch (_) {}
    setFavoriteLoading(false)
  }

  const openQADrawer = (prompt?: string) => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}`)}`)
      return
    }
    setQaInitialPrompt(prompt?.trim() || 'Introduce this person')
    setQaDrawerOpen(true)
  }

  const handleQueryDatabase = async () => {
    const q = dbQuery.trim()
    if (!q || !user?.id) return
    if (!isAuthenticated) {
      try {
        localStorage.setItem(`profile_pending_db_query_${userId}`, q)
      } catch {}
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}`)}`)
      return
    }
    setDbQueryLoading(true)
    setDbQueryResult(null)
    setDbQueryError(null)
    setDbSuggestSendMessage(false)
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: q, targetUserId: user.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setDbQueryResult(data.answer ?? '')
        setDbSuggestSendMessage(!!data.showMessageToTa)
      } else {
        setDbQueryError(data.error || 'Query failed, please try again later')
      }
    } catch {
      setDbQueryError('Network error, please try again later')
    } finally {
      setDbQueryLoading(false)
    }
  }

  const handleGoSendMessage = () => {
    const text = dbQuery.trim()
    if (!text || !user?.id) return
    if (!isAuthenticated) {
      try {
        localStorage.setItem(`profile_pending_db_query_${userId}`, text)
      } catch {}
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}`)}`)
      return
    }
    setSendMessageModalText(text)
    setSendMessageModalStatus('idle')
    setSendMessageModalOpen(true)
  }

  const handleSendMessageFromModal = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(`/u/${userId}`)}`)
      return
    }
    const text = sendMessageModalText.trim()
    if (!text || !user?.id) return
    setSendMessageModalStatus('sending')
    try {
      const res = await fetch('/api/profile-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: user.id, text }),
      })
      if (res.ok) {
        setSendMessageModalStatus('sent')
        setTimeout(() => {
          setSendMessageModalOpen(false)
          setSendMessageModalText('')
          setSendMessageModalStatus('idle')
        }, 800)
      } else {
        setSendMessageModalStatus('error')
      }
    } catch {
      setSendMessageModalStatus('error')
    }
  }

  const parseImages = (content: any) => {
    if (!content?.images) return []
    if (Array.isArray(content.images)) return content.images
    try {
      return JSON.parse(content.images)
    } catch {
      return []
    }
  }

  const getFirstImageUrl = (images: any[]): string => {
    if (!Array.isArray(images) || images.length === 0) return ''
    const firstImg = images[0]
    if (typeof firstImg === 'string') return firstImg
    return firstImg?.imageUrl || firstImg?.imageDataUrl || firstImg?.url || ''
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">User not found</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-40">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="w-10" />
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${isFavorited ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50/50'}`}
              title={isFavorited ? 'Unfavorite' : 'Favorite'}
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              <span className="text-sm">{isFavorited ? 'Favorited' : 'Favorite'}</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* 长版 profile：与 /profile 预览一致，单卡内按顺序叠放，有什么信息就显示什么 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="w-full max-w-sm mx-auto shrink-0">
          <div className="rounded-2xl shadow-xl overflow-hidden bg-gradient-to-b from-blue-100 via-pink-100 to-orange-200 flex flex-col min-h-[320px]">
            {/* 1. Share */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white/80 hover:bg-white border-b border-white/60 transition-colors"
            >
              <Share2 className="w-4 h-4 text-teal-500 shrink-0" />
              Share
            </button>
            {/* 2. 头像 + 底部叠层（标签、名字、一句话、所在地） */}
            <div className="relative flex-1 min-h-[240px] flex flex-col">
              {(profile.avatarDataUrl || user.image) ? (
                <img
                  src={resolveImageUrl(profile.avatarDataUrl || user.image)}
                  alt=""
                  className="w-full h-full min-h-[240px] object-cover object-top"
                />
              ) : (
                <div className="w-full flex-1 min-h-[240px] bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center text-white text-6xl font-bold">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-4 pt-6 pb-4 min-h-[120px] flex flex-col items-center justify-end gap-2">
                <div className="flex flex-wrap justify-center gap-1.5 w-full">
                  {profile.tags && profile.tags.length > 0
                    ? profile.tags.map((tag: string, i: number) => (
                        <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-800 border border-white/90 shadow-sm">
                          {tag}
                        </span>
                      ))
                    : <span className="text-white/80 text-xs">No tags yet</span>}
                </div>
                <div className="flex items-center justify-center w-full">
                  <p className="font-bold text-white text-lg drop-shadow-md text-center">{user.name || 'Anonymous'}</p>
                </div>
                {(profile.oneSentenceDesc || profile.headline) && (
                  <p className="w-full text-center text-white/95 text-sm leading-relaxed px-2 break-words whitespace-pre-wrap drop-shadow-md">
                    {profile.oneSentenceDesc || profile.headline}
                  </p>
                )}
                {user.location && (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-white/95 text-gray-800 border border-white shadow-md">
                    {user.location}
                  </span>
                )}
              </div>
            </div>
            {/* Collect + Message：紧贴图片下方 */}
            <div className="w-full px-3 pt-2 pb-2 shrink-0 border-b border-white/50 flex gap-2">
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${isFavorited ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-white/90 text-gray-700 border border-gray-200 hover:bg-white'}`}
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                Collect
              </button>
              <button
                type="button"
                onClick={() => openQADrawer()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
            </div>
            {/* 与 profile 预览一致：不单独展示「洞察」区块，profile 上展示什么就展示什么 */}
            {/* 4. 简介详情（有则显示） */}
            {profile.bio && (
              <div className="w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1">Bio details</p>
                <p className="text-xs text-gray-800 whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
            {/* 公开页不展示 About（星座、生肖、Core Traits） */}
            {/* 5.5 Public projects: what I'm doing + who I need */}
            {((Array.isArray(profile.projects) && profile.projects.length > 0) || (Array.isArray(profile.collaborationPossibility) && profile.collaborationPossibility.length > 0) || (typeof profile.collaborationPossibility === 'string' && profile.collaborationPossibility) || (Array.isArray(profile.peopleToCollaborateWith) && profile.peopleToCollaborateWith.length > 0) || (typeof profile.peopleToCollaborateWith === 'string' && profile.peopleToCollaborateWith)) && (
              <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">What I want to do (and look for a partner)</p>
                <div className="space-y-2">
                  {Array.isArray(profile.projects) && profile.projects.length > 0 ? (
                    profile.projects.map((proj: { text: string; peopleNeeded?: string[] }, pi: number) => (
                      <div key={pi}>
                        <p className="text-[11px] font-medium text-teal-800">{proj.text}</p>
                        {Array.isArray(proj.peopleNeeded) && proj.peopleNeeded.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {proj.peopleNeeded.map((t: string, i: number) => (
                              <span key={i} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <>
                      {(Array.isArray(profile.collaborationPossibility) ? profile.collaborationPossibility : (profile.collaborationPossibility ? [profile.collaborationPossibility] : [])).length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-500 mb-0.5">What I want to do</p>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(profile.collaborationPossibility) ? profile.collaborationPossibility : [profile.collaborationPossibility])
                              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                              .map((item: string, i: number) => (
                              <span key={i} className="inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium bg-teal-100 text-teal-800 border border-teal-200">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {(Array.isArray(profile.peopleToCollaborateWith) ? profile.peopleToCollaborateWith : (profile.peopleToCollaborateWith ? [profile.peopleToCollaborateWith] : [])).length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-500 mb-0.5">I&apos;m looking for</p>
                          <div className="flex flex-wrap gap-1">
                            {(Array.isArray(profile.peopleToCollaborateWith) ? profile.peopleToCollaborateWith : [profile.peopleToCollaborateWith])
                              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
                              .map((item: string, i: number) => (
                              <span key={i} className="inline-flex px-2 py-0.5 rounded-lg text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200">{item}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
            {/* 6. Social media（有则显示） */}
            {profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
              <div className="flex flex-col items-center w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">Social media</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {Object.entries(profile.socialLinks).map(([key, url]) => {
                    if (!url?.trim()) return null
                    const platform = getPlatformByKey(key)
                    const label = platform?.label || key
                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white border border-white/80"
                        title={label}
                      >
                        {platform?.iconImage ? (
                          <img src={platform.iconImage} alt={label} className="w-5 h-5 object-contain" />
                        ) : (
                          <Link2 className="w-4 h-4" />
                        )}
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
            {/* 7. 作品简介 + Links（有则显示） */}
            {((profile.workIntroductions && profile.workIntroductions.length > 0) || (profile.customLinks && profile.customLinks.length > 0)) && (
              <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">Works</p>
                {profile.workIntroductions && profile.workIntroductions.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {profile.workIntroductions.map((w: { id: string; cover?: string; name: string; description?: string; url?: string }) => {
                      const content = (
                        <>
                          {w.cover ? (
                            <img src={resolveImageUrl(w.cover)} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-[10px]">No cover</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-gray-800 truncate">{w.name}</p>
                            {w.description && <p className="text-[10px] text-gray-600 line-clamp-2">{w.description}</p>}
                          </div>
                        </>
                      )
                      return w.url ? (
                        <a key={w.id} href={w.url} target="_blank" rel="noopener noreferrer" className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80 hover:bg-white/95 cursor-pointer transition-colors">
                          {content}
                        </a>
                      ) : (
                        <div key={w.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
                          {content}
                        </div>
                      )
                    })}
                  </div>
                )}
                {profile.customLinks && profile.customLinks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 mb-0.5">Links</p>
                    {profile.customLinks.map((link: { title?: string; url: string }, i: number) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block py-1 px-2 rounded bg-white/80 text-[10px] text-gray-700 truncate hover:bg-white border border-white/60"
                      >
                        {link.title || link.url}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 7.5 经历：工作 + 教育 */}
            {((profile.experiences && profile.experiences.length > 0) || (profile.education && profile.education.length > 0)) && (
              <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">Experience</p>
                {profile.experiences && profile.experiences.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {profile.experiences.map((e: { id: string; title: string; company: string; employmentType?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }) => (
                      <div key={e.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
                        <Briefcase className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800">{e.title}</p>
                          <p className="text-[10px] text-gray-600">{e.company}{e.employmentType ? ` · ${e.employmentType}` : ''}</p>
                          <p className="text-[10px] text-gray-500">{(e.startDate || e.endDate) ? `${e.startDate || '—'} - ${e.current ? 'Present' : (e.endDate || '—')}` : ''}{e.location ? ` · ${e.location}` : ''}</p>
                          {e.description && <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{e.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {profile.education && profile.education.length > 0 && (
                  <div className="space-y-2">
                    {profile.education.map((e: { id: string; school: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }) => (
                      <div key={e.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
                        <GraduationCap className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800">{e.school}</p>
                          <p className="text-[10px] text-gray-600">{(e.degree || e.fieldOfStudy) ? [e.degree, e.fieldOfStudy].filter(Boolean).join(' · ') : ''}</p>
                          <p className="text-[10px] text-gray-500">{(e.startDate || e.endDate) ? `${e.startDate || '—'} - ${e.endDate || '—'}` : ''}{e.grade ? ` · ${e.grade}` : ''}</p>
                          {e.description && <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{e.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 8. 感兴趣的话题（始终显示该区块，有数据则列出来） */}
            <div className="w-full px-3 pt-2 pb-2 shrink-0 border-t border-white/50">
              <p className="text-[11px] text-gray-500 mb-1">Interested topics · {profile.qaList && profile.qaList.length > 0 ? `${profile.qaList.length}` : 'None'}</p>
              {profile.qaList && profile.qaList.length > 0 ? (
                <div className="space-y-1.5 max-h-[8rem] overflow-y-auto">
                  {profile.qaList.map((qa: { question: string; answer: string }, i: number) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <p className="text-[11px] font-medium text-gray-800">Q: {qa.question}</p>
                      <p className="text-[10px] text-gray-600 pl-2 bg-white/80 rounded border border-white/60 py-0.5">A: {qa.answer || '—'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400">No interested topics yet</p>
              )}
            </div>
            {/* Query my database：对 profile 主人存进系统的信息提问，非 AI 回答 */}
            <div className="w-full px-3 pt-2 pb-2 shrink-0 border-t border-white/50">
              <p className="text-[10px] text-gray-500 mb-1.5">
                Ask about information saved by {user.name || 'this user'} (not AI-generated answers)
              </p>
              <div className="flex items-center rounded-xl border border-gray-200/90 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-teal-400/40 focus-within:border-teal-300">
                <input
                  type="text"
                  value={dbQuery}
                  onChange={(e) => setDbQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQueryDatabase()}
                  placeholder="Query my database"
                  className="flex-1 min-w-0 px-4 py-3 text-sm bg-transparent placeholder-gray-400 text-gray-800 outline-none border-0"
                  disabled={dbQueryLoading}
                />
                <button
                  type="button"
                  onClick={handleQueryDatabase}
                  disabled={!dbQuery.trim() || dbQueryLoading}
                  className="shrink-0 p-3 text-teal-500 hover:text-teal-600 hover:bg-teal-50/80 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  aria-label="Query"
                >
                  {dbQueryLoading ? (
                    <span className="text-xs text-teal-500">…</span>
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </button>
              </div>
              {dbQueryResult && (
                <div className="mt-2 space-y-2">
                  <div className="p-3 rounded-xl bg-white/90 border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap">
                    {dbQueryResult}
                  </div>
                  {dbSuggestSendMessage && (
                    <button
                      type="button"
                      onClick={handleGoSendMessage}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Message them directly
                    </button>
                  )}
                </div>
              )}
              {dbQueryError && <p className="mt-2 text-sm text-red-600">{dbQueryError}</p>}
            </div>
            {/* How to engage me：Online / Offline（有则显示） */}
            {(profile.howToEngageMeOnline || profile.howToEngageMeOffline) && (
              <div className="w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">How to engage me</p>
                <div className="space-y-1">
                  {profile.howToEngageMeOnline && (
                    <p className="text-[11px] text-gray-700"><span className="text-gray-500">Online：</span>{profile.howToEngageMeOnline}</p>
                  )}
                  {profile.howToEngageMeOffline && (
                    <p className="text-[11px] text-gray-700"><span className="text-gray-500">Offline：</span>{profile.howToEngageMeOffline}</p>
                  )}
                </div>
              </div>
            )}
            {/* join [TA] on nexus — TA = 被访者（profile 主人） */}
            <div className="flex flex-col items-center w-full px-4 pt-2 pb-4 shrink-0 border-t border-white/50">
              <a
                href="/"
                className="mt-4 w-full max-w-[200px] py-2.5 rounded-xl bg-white font-medium text-gray-800 text-center text-sm shadow transition-colors hover:bg-gray-50"
              >
                join {user?.name || userId} on nexus
              </a>
            </div>
          </div>
        </div>

        {/* Published Works（有则显示，单独在卡片外） */}
        {publishedContents.length > 0 && (
          <div className="w-full max-w-sm mx-auto mt-6 bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              Published Works
              <span className="text-sm font-normal text-gray-500">({publishedContents.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {publishedContents.map((content) => {
                const images = parseImages(content)
                const firstImageUrl = getFirstImageUrl(images)

                return (
                  <div
                    key={content.id}
                    onClick={() => router.push(`/history/${content.id}`)}
                    className="group relative overflow-hidden rounded-lg border border-teal-100 hover:border-primary hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="aspect-video bg-teal-50 flex items-center justify-center">
                      {firstImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(firstImageUrl)}
                          alt={content.title || 'Published Work'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-primary">
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-xs text-gray-500">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white">
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                        {content.title || 'Published Work'}
                      </h4>
                      {content.storyNarrative && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {content.storyNarrative}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          {content.imageCount || 0} images
                        </span>
                        <span>
                          {new Date(content.publishedAt || content.createdAt).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 直接发消息弹窗：Query 无结果时点击「直接发消息问 TA」打开 */}
      {sendMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => sendMessageModalStatus !== 'sending' && setSendMessageModalOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send message to {user?.name || 'them'}</h3>
              <button
                type="button"
                onClick={() => sendMessageModalStatus !== 'sending' && setSendMessageModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={sendMessageModalText}
              onChange={(e) => setSendMessageModalText(e.target.value)}
              placeholder="Type what you want to ask..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 resize-none"
              disabled={sendMessageModalStatus === 'sending'}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                {sendMessageModalStatus === 'sending' && 'Sending...'}
                {sendMessageModalStatus === 'sent' && 'Sent'}
                {sendMessageModalStatus === 'error' && 'Send failed, please retry'}
              </span>
              <button
                type="button"
                onClick={handleSendMessageFromModal}
                disabled={!sendMessageModalText.trim() || sendMessageModalStatus === 'sending'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 disabled:opacity-50 disabled:pointer-events-none"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileQADrawer
        isOpen={qaDrawerOpen}
        onClose={() => setQaDrawerOpen(false)}
        initialPrompt={qaInitialPrompt}
        targetUserId={user?.id ?? userId}
        profileOwnerName={user?.name}
      />
    </div>
  )
}
