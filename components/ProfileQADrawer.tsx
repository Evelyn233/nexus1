'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'
import Drawer from '@/components/Drawer'

interface Msg {
  id: string
  type: 'user' | 'assistant'
  content: string
  canAskOwner?: boolean
}

export interface ProfileQADrawerProps {
  isOpen: boolean
  onClose: () => void
  initialPrompt: string
  /** 访客在 /u/[userId] 时传入，指定要问的是谁的 profile */
  targetUserId?: string | null
  /** 展示「您的输入将不会发送给 xxx」时的名字 */
  profileOwnerName?: string | null
}

export default function ProfileQADrawer({
  isOpen,
  onClose,
  initialPrompt,
  targetUserId,
  profileOwnerName,
}: ProfileQADrawerProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAuthenticated = status === 'authenticated'
  const [messages, setMessages] = useState<Msg[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [profileOwnerId, setProfileOwnerId] = useState<string | null>(null)
  const [askingOwner, setAskingOwner] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const THINKING_ID = 'thinking-placeholder'

  const goLogin = () => {
    const returnPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(returnPath)}`)
    onClose()
  }

  useEffect(() => {
    if (!isOpen) return
    if (targetUserId) setProfileOwnerId(targetUserId)
    if (!initialPrompt.trim()) {
      setMessages([])
      setInputValue('')
      return
    }
    setMessages([{ id: `u-${Date.now()}`, type: 'user', content: initialPrompt.trim() }])
    setInputValue('')
    setProfileOwnerId(targetUserId ?? null)
    setAskingOwner(null)

    if (status === 'loading') {
      setMessages(prev => [...prev, {
        id: `wait-${Date.now()}`,
        type: 'assistant',
        content: '验证登录中…',
      }])
      setIsLoading(false)
      return
    }
    if (!isAuthenticated) {
      setMessages(prev => [...prev, {
        id: `login-${Date.now()}`,
        type: 'assistant',
        content: '请先登录后再向 TA 提问。',
      }])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const ask = async () => {
      setMessages(prev => [...prev, { id: THINKING_ID, type: 'assistant', content: '正在思考…' }])
      try {
        const res = await fetch('/api/profile-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            messages: [{ role: 'user', content: initialPrompt.trim() }],
            ...(targetUserId ? { targetUserId } : {}),
          }),
        })
        const data = await res.json().catch(() => ({}))
        setMessages(prev => prev.filter(m => m.id !== THINKING_ID))
        if (!res.ok) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            type: 'assistant',
            content: data.error || '回答失败，请稍后再试。',
          }])
          return
        }
        if (data.profileOwnerId) setProfileOwnerId(data.profileOwnerId)
        setMessages(prev => [...prev, {
          id: `a-${Date.now()}`,
          type: 'assistant',
          content: data.answer || '',
          canAskOwner: data.canAnswerFromProfile === false,
        }])
      } catch (e) {
        setMessages(prev => prev.filter(m => m.id !== THINKING_ID).concat([{
          id: `err-${Date.now()}`,
          type: 'assistant',
          content: '回答失败，请稍后再试。',
        }]))
      } finally {
        setIsLoading(false)
      }
    }
    ask()
  }, [isOpen, initialPrompt, targetUserId, isAuthenticated, status])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const val = inputValue.trim()
    if (!val || isLoading) return

    if (!isAuthenticated) {
      setMessages(prev => [...prev, {
        id: `login-${Date.now()}`,
        type: 'assistant',
        content: '请先登录后再向 TA 提问。',
      }])
      return
    }

    setInputValue('')
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, type: 'user', content: val }, { id: THINKING_ID, type: 'assistant', content: '正在思考…' }])
    setIsLoading(true)

    const history = [...messages, { id: '', type: 'user' as const, content: val }]
    const apiMessages = history
      .filter(m => m.type === 'user' || m.type === 'assistant')
      .map(m => ({ role: m.type, content: m.content }))

    try {
      const res = await fetch('/api/profile-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
        messages: apiMessages,
        ...(targetUserId ? { targetUserId } : {}),
      }),
      })
      const data = await res.json().catch(() => ({}))
      setMessages(prev => prev.filter(m => m.id !== THINKING_ID))
      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          type: 'assistant',
          content: data.error || '回答失败，请稍后再试。',
        }])
        return
      }
      if (data.profileOwnerId) setProfileOwnerId(data.profileOwnerId)
      setMessages(prev => [...prev, {
        id: `a-${Date.now()}`,
        type: 'assistant',
        content: data.answer || '',
        canAskOwner: data.canAnswerFromProfile === false,
      }])
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== THINKING_ID).concat([{
        id: `err-${Date.now()}`,
        type: 'assistant',
        content: '回答失败，请稍后再试。',
      }]))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAskOwner = async (question: string) => {
    if (!profileOwnerId || askingOwner) return
    setAskingOwner(question)
    try {
      const res = await fetch('/api/profile-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: profileOwnerId, text: question }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          type: 'assistant',
          content: '已转达给 TA，TA 看到后会回复你。',
        }])
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          type: 'assistant',
          content: data.error || '发送失败，请稍后再试。',
        }])
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        type: 'assistant',
        content: '发送失败，请稍后再试。',
      }])
    } finally {
      setAskingOwner(null)
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="向 TA 提问"
      minimizable={true}
    >
      <div className="flex flex-col h-[70vh]">
        {!isAuthenticated && (
          <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2">
            <span className="text-sm text-amber-800">请先登录后再向 TA 提问</span>
            <button
              type="button"
              onClick={goLogin}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600"
            >
              去登录
            </button>
          </div>
        )}
        <p className="text-xs text-gray-500 mb-2 px-1">
          {(session?.user as { id?: string })?.id && profileOwnerId && (session?.user as { id?: string }).id === profileOwnerId
            ? '随便和 AI 聊聊吧～'
            : `您的输入将不会发送给 ${profileOwnerName || 'profile 主人'}。`}
        </p>
        <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pb-4">
          {messages.map((m, idx) => {
            const prevUserContent = m.type === 'assistant'
              ? messages.slice(0, idx).filter(x => x.type === 'user').pop()?.content ?? ''
              : ''
            return (
              <div key={m.id} className={m.type === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    m.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.content}
                </div>
                {m.type === 'assistant' && (m as Msg).canAskOwner && profileOwnerId && prevUserContent && (
                  <div className="mt-2 text-left">
                    <button
                      type="button"
                      onClick={() => handleAskOwner(prevUserContent)}
                      disabled={!!askingOwner}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {askingOwner === prevUserContent ? '发送中…' : '问 profile 主人'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              if (!isAuthenticated) {
                goLogin()
                return
              }
              setInputValue(e.target.value)
            }}
            onFocus={() => {
              if (!isAuthenticated) goLogin()
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={!isAuthenticated ? '登录后可输入…' : '继续问…'}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>发送</span>
          </button>
        </div>
      </div>
    </Drawer>
  )
}
