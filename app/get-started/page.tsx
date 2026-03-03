'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function GetStartedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (status !== 'authenticated' || !session?.user) {
      router.replace('/')
      return
    }

    const type = searchParams.get('type') === 'project' ? 'project' : 'personal'
    const name = searchParams.get('name')?.trim() || ''
    const linkSuffix = searchParams.get('linkSuffix')?.trim() || ''
    if (!linkSuffix) {
      setError('Missing link suffix')
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        const saveRes = await fetch('/api/user/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: name || undefined,
            profileSlug: linkSuffix,
          }),
        })
        const saveData = await saveRes.json().catch(() => ({}))
        if (!saveRes.ok && saveData?.error) {
          if (saveRes.status === 409 || saveData.error === 'Username already taken') {
            const params = new URLSearchParams({ error: 'username_taken', linkSuffix })
            if (name) params.set('name', name)
            params.set('type', type)
            if (!cancelled) router.replace(`/?${params.toString()}`)
            return
          }
          setError(saveData.error || 'Save failed')
          return
        }

        if (type === 'project') {
          const createRes = await fetch('/api/project/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: name || 'New Project' }),
          })
          const createData = await createRes.json().catch(() => ({}))
          if (!createRes.ok || !createData?.ok) {
            setError(createData?.error || 'Create project failed')
            return
          }
          if (!cancelled) {
            router.replace(`/u/${linkSuffix}/project/${createData.createdAt}?edit=1`)
          }
        } else {
          if (!cancelled) {
            router.replace('/profile')
          }
        }
      } catch (e) {
        if (!cancelled) setError('Something went wrong')
      }
    }

    run()
    return () => { cancelled = true }
  }, [status, session, router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0f14] text-white">
        <p className="text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f14] text-white">
      <div className="animate-pulse text-teal-400">Setting up...</div>
    </div>
  )
}
