'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { LayoutGrid, ArrowRight, Plus } from 'lucide-react'

function getSharePath(profileSlug?: string | null, name?: string | null, id?: string): string {
  if (profileSlug && /^[a-zA-Z0-9_-]+$/.test(profileSlug)) return profileSlug
  const slugFromName = (name || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '')
  if (slugFromName) return slugFromName
  return id || ''
}

type ProjectItem = { text?: string; createdAt?: number; [k: string]: unknown }

export default function ProjectPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [profileSlug, setProfileSlug] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent('/project')}`)
      return
    }
    if (!isAuthenticated) return

    let cancelled = false
    fetch('/api/user/info', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const pd = data?.profileData
        const list = Array.isArray(pd?.projects) ? pd.projects : []
        setProjects(list)
        setProfileSlug(data?.userInfo?.profileSlug ?? data?.userInfo?.name ?? null)
        setUserName(data?.userInfo?.name ?? null)
        setUserId(data?.userInfo?.id ?? null)
      })
      .catch(() => { if (!cancelled) setProjects([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isAuthenticated, isLoading, router])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0f14] flex items-center justify-center">
        <div className="animate-pulse text-teal-400">Loading...</div>
      </div>
    )
  }

  const slug = getSharePath(profileSlug, userName, userId ?? '')

  const handleCreateProject = async () => {
    if (!slug) return
    try {
      setCreating(true)
      const res = await fetch('/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.createdAt) return
      router.push(`/u/${encodeURIComponent(slug)}/project/${data.createdAt}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-400 hover:text-white">Home</Link>
          <div className="flex items-center gap-2">
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white">Portal</Link>
            <span className="text-teal-400 font-medium">/project</span>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-white mb-2">Projects</h1>
        <p className="text-sm text-gray-400 mb-6">Manage your projects: create, view, and share project details.</p>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <p className="text-amber-200 mb-4">No projects yet</p>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={creating || !slug}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create New Project'}
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p: ProjectItem) => {
              const ts = p.createdAt
              const projectLink = slug && ts ? `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${encodeURIComponent(slug)}/project/${ts}` : ''
              return (
                <li key={ts ?? Math.random()}>
                  <Link
                    href={projectLink ? `/u/${encodeURIComponent(slug)}/project/${ts}` : '#'}
                    className="block rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{(p.text ?? 'Untitled').toString().trim() || 'Untitled'}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                    {projectLink && (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            navigator.clipboard.writeText(projectLink).catch(() => {})
                          }}
                          className="text-[11px] text-teal-400 hover:text-teal-300 underline underline-offset-2"
                          title="Copy share link"
                        >
                          {projectLink.replace(/^https?:\/\//, '')}
                        </button>
                        <span className="text-[10px] text-gray-500">Click to copy & share</span>
                      </div>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300"
          >
            <LayoutGrid className="w-4 h-4" />
            Back to Portal
          </Link>
        </div>
      </main>
    </div>
  )
}
