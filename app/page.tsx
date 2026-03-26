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
  const [personalLinkSuffix, setPersonalLinkSuffix] = useState('')
  const [personalSlugTaken, setPersonalSlugTaken] = useState(false)
  const [personalError, setPersonalError] = useState<string | null>(null)
  const [projectLinkSuffix, setProjectLinkSuffix] = useState('')
  const [projectSlugTaken, setProjectSlugTaken] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  // 仅客户端设置，避免 SSR 与客户端 host 不一致导致 hydration 报错
  const [displayHost, setDisplayHost] = useState('')

  useEffect(() => {
    setDisplayHost(typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : '')
  }, [])

  useEffect(() => {
    const err = searchParams.get('error')
    const ls = searchParams.get('linkSuffix')
    const t = searchParams.get('type')
    if (err === 'username_taken' && ls) {
      if (t === 'project') {
        setProjectLinkSuffix(ls)
        setProjectSlugTaken(true)
      } else {
        setPersonalLinkSuffix(ls)
        setPersonalSlugTaken(true)
      }
      router.replace('/', { scroll: false })
    }
  }, [searchParams, router])

  const checkSlug = useCallback(async (slug: string, setTaken: (v: boolean) => void) => {
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      setTaken(false)
      return
    }
    try {
      const r = await fetch(`/api/user/check-slug?slug=${encodeURIComponent(slug)}`)
      const d = await r.json().catch(() => ({}))
      setTaken(!d?.available)
    } catch {
      setTaken(false)
    }
  }, [])

  useEffect(() => {
    const slug = slugify(personalLinkSuffix)
    if (!slug) { setPersonalSlugTaken(false); return }
    const t = setTimeout(() => checkSlug(slug, setPersonalSlugTaken), 400)
    return () => clearTimeout(t)
  }, [personalLinkSuffix, checkSlug])

  useEffect(() => {
    const slug = slugify(projectLinkSuffix)
    if (!slug) { setProjectSlugTaken(false); return }
    const t = setTimeout(() => checkSlug(slug, setProjectSlugTaken), 400)
    return () => clearTimeout(t)
  }, [projectLinkSuffix, checkSlug])

  const handleSubmitPersonal = () => {
    setPersonalError(null)
    const slug = slugify(personalLinkSuffix)
    if (!slug) {
      setPersonalError('请输入用户名（仅支持字母、数字、下划线、连字符）')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      setPersonalError('Link 后缀仅支持字母、数字、下划线、连字符')
      return
    }
    if (personalSlugTaken) {
      setPersonalError('Username already taken — please change it')
      return
    }
    const params = new URLSearchParams({ type: 'personal', linkSuffix: slug })
    const callback = `/get-started?${params.toString()}`
    try {
      // Personal 流程强制先停在注册页（即使当前已登录也不自动跳 get-started）
      router.push(`/auth/signup?callbackUrl=${encodeURIComponent(callback)}&forceSignup=1`)
    } catch (e) {
      setPersonalError('跳转失败，请重试')
    }
  }

  const handleSubmitProject = () => {
    setProjectError(null)
    const slug = slugify(projectLinkSuffix)
    if (!slug) {
      setProjectError('请输入用户名（仅支持字母、数字、下划线、连字符）')
      return
    }
    if (!/^[a-z0-9_-]+$/.test(slug)) {
      setProjectError('Link 后缀仅支持字母、数字、下划线、连字符')
      return
    }
    if (projectSlugTaken) {
      setProjectError('Username already taken — please change it')
      return
    }
    const params = new URLSearchParams({ type: 'project', linkSuffix: slug })
    params.set('name', slug)
    const callback = `/get-started?${params.toString()}`
    try {
      // 始终先进入注册页，保证「注册账号 + get started」流程；已登录时由注册页再跳到 get-started
      router.push(`/auth/signup?callbackUrl=${encodeURIComponent(callback)}`)
    } catch (e) {
      setProjectError('跳转失败，请重试')
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

        {/* Personal profile and Project profile — two separate links */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
              Create your homepage
            </h2>
            <p className="text-center text-gray-400 mb-10">
              Personal profile or project page — each with its own link.
            </p>
            <div className="flex flex-col gap-8 max-w-2xl mx-auto">
              {/* Personal Profile — top */}
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-teal-400" />
                  <h3 className="text-lg font-semibold text-teal-400">Personal Profile</h3>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Enter your username (name) for your profile link.</p>
                  <div className={`flex overflow-hidden rounded-xl border-2 ${personalSlugTaken ? 'border-red-400' : 'border-teal-400/60'}`}>
                    <span className="flex items-center px-4 py-3.5 bg-gray-100 text-gray-600 text-sm shrink-0 font-mono border-r border-gray-200">
                      {displayHost || 'nexus.com'}/profile/
                    </span>
                    <input
                      type="text"
                      value={personalLinkSuffix}
                      onChange={(e) => { setPersonalLinkSuffix(e.target.value); setPersonalSlugTaken(false); setPersonalError(null) }}
                      placeholder="Your username (letters, numbers, underscore, hyphen)"
                      className="flex-1 min-w-0 w-full px-4 py-3.5 bg-white text-gray-900 text-base font-medium placeholder-gray-400 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">After login, use /profile to manage. Public link: /u/your-username</p>
                  {personalSlugTaken && <p className="text-sm text-amber-400 mt-1">Username taken — please change</p>}
                  {personalError && <p className="text-sm text-red-400 mt-1">{personalError}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmitPersonal()}
                  className="w-full px-4 py-3 rounded-xl border border-teal-500 bg-teal-500 text-gray-900 font-medium hover:bg-teal-400 transition-colors"
                >
                  Create Profile
                </button>
              </div>

              {/* Project — bottom */}
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <FolderPlus className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-amber-400">Create Project</h3>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Enter your username (name) for your project link.</p>
                  <div className={`flex overflow-hidden rounded-xl border-2 ${projectSlugTaken ? 'border-red-400' : 'border-amber-400/70'}`}>
                    <span className="flex items-center px-4 py-3.5 bg-amber-50 text-amber-800/80 text-sm shrink-0 font-mono border-r border-amber-200">
                      {displayHost || 'nexus.com'}/project/
                    </span>
                    <input
                      type="text"
                      value={projectLinkSuffix}
                      onChange={(e) => { setProjectLinkSuffix(e.target.value); setProjectSlugTaken(false); setProjectError(null) }}
                      placeholder="Your username (letters, numbers, underscore, hyphen)"
                      className="flex-1 min-w-0 w-full px-4 py-3.5 bg-white text-gray-900 text-base font-medium placeholder-gray-400 focus:outline-none focus:ring-0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">After creation, use /project to manage. Project page: /u/your-username/project/project-id</p>
                  {projectSlugTaken && <p className="text-sm text-amber-400 mt-1">Username taken — please change</p>}
                  {projectError && <p className="text-sm text-red-400 mt-1">{projectError}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmitProject()}
                  className="w-full px-4 py-3 rounded-xl border border-amber-500 bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-4">Letters, numbers, underscore, hyphen only for link suffix</p>
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
