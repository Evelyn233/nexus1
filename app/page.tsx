'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { User, LayoutGrid, Plus } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [projectDraft, setProjectDraft] = useState('')

  const goToProfile = () => {
    if (session) router.push('/profile')
    else router.push('/auth/signup?callbackUrl=/profile')
  }

  const goToPlaza = () => {
    if (session) router.push('/square')
    else router.push('/auth/signup?callbackUrl=/square')
  }

  const handleCreateProject = () => {
    const name = projectDraft.trim()
    const callback = name ? `/profile?addProject=${encodeURIComponent(name)}` : '/profile'
    if (session) router.push(callback)
    else router.push(`/auth/signup?callbackUrl=${encodeURIComponent(callback)}`)
    setProjectDraft('')
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
          <div className="mt-10">
            <Link
              href="/auth/signup"
              className="inline-block px-8 py-4 bg-teal-500 hover:bg-teal-400 text-gray-900 font-semibold rounded-xl transition-colors"
            >
              Get Started →
            </Link>
          </div>
        </section>

        {/* Entry points: Profile / Plaza + Create project */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
              Get Started
            </h2>
            <p className="text-center text-gray-400 mb-12">
              Build your profile, browse projects, or create one directly.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              <button
                type="button"
                onClick={goToProfile}
                className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 p-6 text-left hover:bg-white/10 hover:border-teal-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-4 group-hover:bg-teal-500/30 transition-colors">
                  <User className="w-6 h-6 text-teal-400" />
                </div>
                <h3 className="text-lg font-semibold text-teal-400 mb-2">Individual Profile</h3>
                <p className="text-gray-400 text-sm">Create your profile, add projects, and showcase your work to attract collaborators.</p>
              </button>
              <button
                type="button"
                onClick={goToPlaza}
                className="rounded-2xl border border-white/10 overflow-hidden bg-white/5 p-6 text-left hover:bg-white/10 hover:border-teal-500/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                  <LayoutGrid className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-amber-400 mb-2">Plaza</h3>
                <p className="text-gray-400 text-sm">Browse collaboration intents, publish yours, and find the right people to execute with.</p>
              </button>
            </div>
            <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-gray-300 mb-2">Create a project directly</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectDraft}
                  onChange={(e) => setProjectDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  placeholder="Enter project name..."
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={handleCreateProject}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-teal-500 text-gray-900 rounded-xl hover:bg-teal-400 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </button>
              </div>
            </div>
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
