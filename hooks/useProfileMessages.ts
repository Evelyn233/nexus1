'use client'

import { useState, useEffect, useCallback } from 'react'

export type ProfileMessage = {
  id: string
  text: string
  createdAt: string
  from: { id: string; name: string; image: string | null } | null
}

type Params = {
  isAuthenticated: boolean
  userId?: string
}

export function useProfileMessages({ isAuthenticated, userId }: Params) {
  const [profileMessages, setProfileMessages] = useState<ProfileMessage[]>([])
  const [showMessagesModal, setShowMessagesModal] = useState(false)
  const [sendMessageDraft, setSendMessageDraft] = useState('')
  const [sendToEvelynFeedback, setSendToEvelynFeedback] =
    useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0)

  const fetchProfileMessages = useCallback(() => {
    fetch('/api/profile-messages', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => setProfileMessages(data.messages || []))
      .catch(() => setProfileMessages([]))
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchProfileMessages()
  }, [isAuthenticated, fetchProfileMessages])

  useEffect(() => {
    if (showMessagesModal) fetchProfileMessages()
  }, [showMessagesModal, fetchProfileMessages])

  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(fetchProfileMessages, 15000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchProfileMessages()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated, fetchProfileMessages])

  useEffect(() => {
    try {
      const raw =
        typeof window !== 'undefined'
          ? localStorage.getItem('profileMessagesLastSeen')
          : null
      if (raw != null) setLastSeenMessageCount(Math.max(0, parseInt(raw, 10)))
    } catch {}
  }, [])

  const markMessagesSeen = useCallback(() => {
    setLastSeenMessageCount(profileMessages.length)
    try {
      localStorage.setItem('profileMessagesLastSeen', String(profileMessages.length))
    } catch {}
  }, [profileMessages.length])

  const unreadCount = Math.max(0, profileMessages.length - lastSeenMessageCount)

  const openMessages = () => {
    setShowMessagesModal(true)
    markMessagesSeen()
  }

  const closeMessages = () => setShowMessagesModal(false)

  const handleSendToEvelyn = useCallback(
    async (lastQuery: string) => {
      const q = lastQuery.trim()
      if (!q || !userId) return
      setSendToEvelynFeedback('sending')
      try {
        const res = await fetch('/api/profile-messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ toUserId: userId, text: q }),
        })
        if (res.ok) {
          setSendToEvelynFeedback('sent')
          fetchProfileMessages()
          setTimeout(() => setSendToEvelynFeedback('idle'), 2500)
        } else {
          setSendToEvelynFeedback('error')
          setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
        }
      } catch {
        setSendToEvelynFeedback('error')
        setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
      }
    },
    [userId, fetchProfileMessages]
  )

  const handleSendMessageFromModal = useCallback(async () => {
    const text = sendMessageDraft.trim()
    if (!text || !userId) return
    setSendToEvelynFeedback('sending')
    try {
      const res = await fetch('/api/profile-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: userId, text }),
      })
      if (res.ok) {
        setSendToEvelynFeedback('sent')
        fetchProfileMessages()
        setTimeout(() => {
          setSendToEvelynFeedback('idle')
          setShowMessagesModal(false)
          setSendMessageDraft('')
        }, 1500)
      } else {
        setSendToEvelynFeedback('error')
        setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
      }
    } catch {
      setSendToEvelynFeedback('error')
      setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
    }
  }, [sendMessageDraft, userId, fetchProfileMessages])

  return {
    profileMessages,
    showMessagesModal,
    openMessages,
    closeMessages,
    sendMessageDraft,
    setSendMessageDraft,
    sendToEvelynFeedback,
    unreadCount,
    handleSendToEvelyn,
    handleSendMessageFromModal,
  }
}

