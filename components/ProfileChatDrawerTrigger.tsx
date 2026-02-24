'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import ProfileChatDrawer from './ProfileChatDrawer'

type OpenPayload = { prompt: string; image?: string; directToUser?: boolean }

export default function ProfileChatDrawerTrigger() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState<string | undefined>(undefined)
  const [directToUser, setDirectToUser] = useState(false)

  useEffect(() => {
    const handler = (e: CustomEvent<OpenPayload>) => {
      const { prompt: p, image: img, directToUser: dt } = e.detail || {}
      if (p && typeof p === 'string') {
        setPrompt(p.trim())
        setImage(typeof img === 'string' ? img : undefined)
        setDirectToUser(dt === true)
        setOpen(true)
      }
    }
    window.addEventListener('globalChat:openProfileChat', handler as EventListener)
    return () => window.removeEventListener('globalChat:openProfileChat', handler as EventListener)
  }, [])

  // 从 /chat-new?prompt&autoStart 重定向过来：?openProfileChat=1，数据在 sessionStorage
  useEffect(() => {
    if (pathname !== '/' || searchParams.get('openProfileChat') !== '1') return
    try {
      const raw = sessionStorage.getItem('profileChat:open')
      if (!raw) return
      const data = JSON.parse(raw) as { prompt?: string; image?: string }
      sessionStorage.removeItem('profileChat:open')
      if (data.prompt && typeof data.prompt === 'string') {
        setPrompt(data.prompt.trim())
        setImage(typeof data.image === 'string' ? data.image : undefined)
        setDirectToUser(false)
        setOpen(true)
      }
    } catch (_) {}
    router.replace('/', { scroll: false })
  }, [pathname, searchParams, router])

  // 弹窗开/关时通知底部对话框隐藏，避免串位
  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('profileChat:drawerOpen'))
    } else {
      window.dispatchEvent(new CustomEvent('profileChat:drawerClose'))
    }
  }, [open])

  return (
    <ProfileChatDrawer
      isOpen={open}
      onClose={() => setOpen(false)}
      initialPrompt={prompt}
      initialImage={image}
      directToUser={directToUser}
    />
  )
}
