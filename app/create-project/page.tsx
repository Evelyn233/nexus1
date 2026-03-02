'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function CreateProjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (status !== 'authenticated' || !session?.user) {
      const name = searchParams.get('name')
      const callback = name ? `/create-project?name=${encodeURIComponent(name)}` : '/create-project'
      router.replace(`/auth/signup?callbackUrl=${encodeURIComponent(callback)}`)
      return
    }

    let cancelled = false
    const name = searchParams.get('name')?.trim() || ''
    fetch('/api/project/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: name || undefined }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.ok && data?.userId != null && data?.createdAt != null) {
          router.replace(`/u/${data.userId}/project/${data.createdAt}`)
        } else {
          setError(data?.error || '创建失败')
        }
      })
      .catch(() => {
        if (!cancelled) setError('创建失败')
      })

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
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f14] text-white">
      <div className="animate-pulse text-teal-400">Creating project...</div>
    </div>
  )
}
