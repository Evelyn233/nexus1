'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { User, FolderPlus } from 'lucide-react'

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
}

export default function LandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [createType, setCreateType] = useState<'personal' | 'project'>('personal')
  const [name, setName] = useState('')
  const [linkSuffix, setLinkSuffix] = useState('')
  const [error, setError] = useState('')
  const [slugTaken, setSlugTaken] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    const ls = searchParams.get('linkSuffix')
    const n = searchParams.get('name')
    const t = searchParams.get('type')
    if (err === 'username_taken' && ls) {
      setLinkSuffix(ls)
      setSlugTaken(true)
      if (n) setName(n)
      if (t === 'project') setCreateType('project')
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  const handleLinkSuffixChange = (v: string) => {
    setLinkSuffix(v)
    if (slugTaken) setSlugTaken(false)
  }

  const checkSlug = useCallback(async (slug: string) => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      setSlugTaken(false)
      return
    }
    try {
      const r = await fetch(`/api/user/check-slug?slug=${encodeURIComponent(slug)}`)
      const d = await r.json().catch(() => ({}))
      setSlugTaken(!d?.available)
    } catch {
      setSlugTaken(false)
    }
  }, [])

  useEffect(() => {
    const slug = slugify(linkSuffix)
    if (!slug) {
      setSlugTaken(false)
      return
    }
    const t = setTimeout(() => checkSlug(slug), 400)
    return () => clearTimeout(t)
  }, [linkSuffix, checkSlug])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const previewUrl = linkSuffix ? `${baseUrl}/u/${slugify(linkSuffix) || linkSuffix}` : `${baseUrl}/u/`

  const handleSubmit = () => {
    setError('')
    const slug = slugify(linkSuffix)
    const displayName = name.trim() || (createType === 'project' ? 'New Project' : '')
    if (!slug) {
      setError('请输入 link 后缀（用户名）')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      setError('Link 后缀仅支持字母、数字、下划线、连字符')
      return
    }
    if (slugTaken) {
      setError('Username already taken — please change it')
      return
    }
    const params = new URLSearchParams({ type: createType, linkSuffix: slug })
    if (displayName) params.set('name', displayName)
    const callback = `/get-started?${params.toString()}`
    if (session) {
      router.push(callback)
    } else {
      router.push(`/auth/signup?callbackUrl=${encodeURIComponent(callback)}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-nexus.jpeg" alt="Nexus" className="h-10 w-auto object-contain rounded-lg" />
              <span className="font-semibold text-lg tracking-tight">Nexus</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/auth/signin" className="text-sm text-gray-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-gray-900 font-medium rounded-lg transition-colors text-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero — 原主标题 */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-teal-400">Project-Oriented Collaboration</span>{' '}
            for Creators
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-teal-300 font-medium">
            Build real projects. Find the right collaborators. Ship faster.
          </p>
          <p className="mt-6 text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A project-first profile system that helps you showcase real work, attract the right people, and move from idea to execution.
          </p>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            Films. Documentaries. Music. Podcasts. Interviews. Research. Nexus helps you connect, collaborate, and execute across disciplines and platforms. Built for creators who move ideas from concept to reality.
          </p>
        </section>

        {/* Create personal homepage or project homepage */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Create your homepage
            </h2>
            <p className="text-center text-gray-400 mb-8">
              Personal profile or project page — choose one and claim your link.
            </p>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Type</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateType('personal')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      createType === 'personal'
                        ? 'border-teal-500 bg-teal-500/20 text-teal-400'
                        : 'border-white/10 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateType('project')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                      createType === 'project'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                        : 'border-white/10 hover:border-white/20 text-gray-400'
                    }`}
                  >
                    <FolderPlus className="w-4 h-4" />
                    Project
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Name</p>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={createType === 'project' ? 'Project name' : 'Your display name'}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Link suffix (username)</p>
                <div className={`flex items-center gap-2 rounded-xl bg-white/5 border px-3 py-2.5 ${slugTaken ? 'border-red-500/50' : 'border-white/10'} text-gray-400`}>
                  <span className="text-sm shrink-0">{baseUrl || 'https://nexus.com'}/u/</span>
                  <input
                    type="text"
                    value={linkSuffix}
                    onChange={(e) => handleLinkSuffixChange(e.target.value)}
                    placeholder="username"
                    className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none min-w-0"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Letters, numbers, underscore, hyphen only</p>
                {slugTaken && (
                  <p className="text-sm text-amber-400 mt-1">Username already taken — please change it</p>
                )}
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full px-4 py-3 rounded-xl border border-teal-500 bg-teal-500 text-gray-900 font-medium hover:bg-teal-400 transition-colors"
              >
                Create {createType === 'personal' ? 'Profile' : 'Project'}
              </button>
            </div>
            {previewUrl && (
              <p className="mt-3 text-center text-xs text-gray-500">
                Your link: <span className="text-teal-400">{previewUrl}</span>
              </p>
            )}
          </div>
        </section>

        {/* Key Features */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10">Key Features</h2>
            <p className="text-center text-gray-400 mb-10">Built for project-oriented collaboration: show your work, signal what you need, and find people who can contribute.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20">
                <h3 className="text-lg font-semibold text-teal-400 mb-2">Showcase Your Projects</h3>
                <p className="text-gray-400 text-sm">Present what you actually create, from ideas to finished output, so people understand your strengths at a glance.</p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20">
                <h3 className="text-lg font-semibold text-teal-400 mb-2">Start Project Collaboration</h3>
                <p className="text-gray-400 text-sm">Match with people who can complement your role and help you execute, whether you are producing, building, or distributing.</p>
              </div>
              <div className="p-6 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20">
                <h3 className="text-lg font-semibold text-teal-400 mb-2">Publish Collaboration Signals</h3>
                <p className="text-gray-400 text-sm">Post clear collaboration intent to Plaza, so the right partners can discover you and jump into the project quickly.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Nexus */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl font-bold text-gray-300 mb-6">Why Nexus</h2>
            <p className="text-2xl sm:text-3xl font-bold text-teal-400 leading-relaxed">
              Traditional profiles show who you are. Nexus shows what you can do and who you can do it with.
            </p>
            <p className="mt-4 text-gray-400 text-lg">
              In the age of AI and cross-disciplinary content creation, visibility isn&apos;t enough — execution is everything. Nexus transforms your profile into a collaboration engine, turning ideas into real projects, faster and smarter.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20 text-center">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Ready to turn ideas into real projects?
            </h2>
            <p className="mt-4 text-gray-400">
              Transform your profile into a collaboration engine — connect, collaborate, and execute.
            </p>
            <div className="mt-8">
              <Link
                href="/auth/signup"
                className="inline-block px-8 py-4 bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold rounded-xl transition-colors"
              >
                Get Started →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Nexus — AI-Powered Collaboration Profiles for Multi-Disciplinary Creators.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
