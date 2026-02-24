'use client'

import { useState, useEffect } from 'react'
import ProfileQADrawer from './ProfileQADrawer'

type Payload = { prompt: string; targetUserId?: string }

export default function ProfileQADrawerTrigger() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [targetUserId, setTargetUserId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: CustomEvent<Payload>) => {
      const p = e.detail?.prompt
      if (typeof p === 'string') {
        setPrompt(p.trim())
        setTargetUserId(e.detail?.targetUserId ?? null)
        setOpen(true)
      }
    }
    window.addEventListener('globalChat:openProfileQA', handler as EventListener)
    return () => window.removeEventListener('globalChat:openProfileQA', handler as EventListener)
  }, [])

  useEffect(() => {
    if (open) {
      window.dispatchEvent(new CustomEvent('profileChat:drawerOpen'))
    } else {
      window.dispatchEvent(new CustomEvent('profileChat:drawerClose'))
    }
  }, [open])

  return (
    <ProfileQADrawer
      isOpen={open}
      onClose={() => setOpen(false)}
      initialPrompt={prompt}
      targetUserId={targetUserId}
    />
  )
}
