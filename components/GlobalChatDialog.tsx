'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function GlobalChatDialog() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const [showEditProfileQuestion, setShowEditProfileQuestion] = useState(false)
  const [collaborationHint, setCollaborationHint] = useState<string | null>(null)
  const [collaborationHintLoading, setCollaborationHintLoading] = useState(false)

  // 从 /u/[userId] 提取 targetUserId
  const publicProfileMatch = pathname?.match(/^\/u\/([^/]+)$/)
  const targetUserId = publicProfileMatch?.[1] ?? null

  // 点击 Edit Profile 时，底部对话框显示引导问题
  useEffect(() => {
    const handler = () => setShowEditProfileQuestion(true)
    window.addEventListener('globalChat:editProfile', handler)
    return () => window.removeEventListener('globalChat:editProfile', handler)
  }, [])

  // 弹窗打开时隐藏底部对话框，避免串位
  const [drawerOpen, setDrawerOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setDrawerOpen(true)
    const onClose = () => setDrawerOpen(false)
    window.addEventListener('profileChat:drawerOpen', onOpen)
    window.addEventListener('profileChat:drawerClose', onClose)
    return () => {
      window.removeEventListener('profileChat:drawerOpen', onOpen)
      window.removeEventListener('profileChat:drawerClose', onClose)
    }
  }, [])

  // 在公开页且已登录时，加载潜在合作可能性提示（结合双方完整档案，生成后自动入库）
  useEffect(() => {
    if (!targetUserId || !isAuthenticated || collaborationHintLoading) return
    setCollaborationHintLoading(true)
    fetch(`/api/profile-collaboration-hint?targetUserId=${encodeURIComponent(targetUserId)}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.hint) {
          setCollaborationHint(data.hint)
          try {
            const key = 'profile_viewed_potential'
            const raw = localStorage.getItem(key)
            const list: { targetUserId: string; targetName?: string; hint: string; possibleTopics?: string[]; viewedAt: string }[] = raw ? JSON.parse(raw) : []
            const existing = list.findIndex((x) => x.targetUserId === targetUserId)
            const entry = { targetUserId, targetName: data.targetName ?? undefined, hint: data.hint, possibleTopics: data.possibleTopics ?? [], viewedAt: new Date().toISOString() }
            if (existing >= 0) list[existing] = entry
            else list.unshift(entry)
            localStorage.setItem(key, JSON.stringify(list.slice(0, 50)))
            window.dispatchEvent(new CustomEvent('potentialConnection:updated'))
          } catch (_) {}
        }
      })
      .catch(() => {})
      .finally(() => setCollaborationHintLoading(false))
  }, [targetUserId, isAuthenticated])

  // 🔥 某些页面不需要显示全局对话框（它们有自己的输入框）
  const hideOnPages = ['/chat-new', '/auth/signin', '/auth/signup']
  const shouldHide = hideOnPages.some(page => pathname?.startsWith(page)) || drawerOpen

  if (shouldHide) {
    return null
  }

  const handleClick = () => {
    if (!isAuthenticated) {
      const returnTo = pathname && pathname.startsWith('/') ? pathname : '/profile'
      router.push(`/auth/signup?callbackUrl=${encodeURIComponent(returnTo)}`)
      return
    }
    const prompt = showEditProfileQuestion
      ? ''
      : (collaborationHint && targetUserId
        ? `结合你（我）与 TA 的背景，你们的潜在合作可能是：${collaborationHint}。你能否展开聊聊？`
        : targetUserId
          ? '和 AI 聊聊这个人'
          : '')
    window.dispatchEvent(new CustomEvent('globalChat:openProfileQA', {
      detail: { prompt, targetUserId: targetUserId ?? undefined }
    }))
  }

  const isPublicProfile = !!targetUserId
  const buttonText = !isAuthenticated && isPublicProfile
    ? '注册账号生成合作提示'
    : isPublicProfile
      ? '和 AI 聊聊 TA 的关系和合作可能性'
      : '和 AI 聊聊'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={isAuthenticated && collaborationHintLoading && !!targetUserId}
        className="mb-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-t-lg bg-white/95 border border-b-0 border-x border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] hover:bg-white transition-colors shrink-0 max-w-[280px] disabled:opacity-70"
        title={isPublicProfile ? '和 AI 聊聊 TA 的关系和合作可能性' : '和 AI 聊聊'}
      >
        {targetUserId && isAuthenticated && collaborationHint && (
          <p className="text-xs text-gray-700 text-center px-2 line-clamp-2 w-full">
            {collaborationHint}
          </p>
        )}
        {targetUserId && collaborationHintLoading && (
          <p className="text-[10px] text-gray-500">正在生成…</p>
        )}
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <MessageSquare className="w-4 h-4 text-primary shrink-0" />
          {buttonText}
        </span>
      </button>
    </div>
  )
}
