'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Layers } from 'lucide-react'

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f14]" />}>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const urlError = searchParams.get('error')
  const [projectIdea, setProjectIdea] = useState('')
  const [ideaError, setIdeaError] = useState('')
  const [submitError, setSubmitError] = useState(
    urlError === 'username_taken'
      ? 'That profile link is already taken. Try different wording or sign in to use your saved link.'
      : ''
  )
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const error = searchParams.get('error')
    const name = searchParams.get('name')
    if (!error && !name) return
    router.replace('/', { scroll: false })
  }, [searchParams, router])

  const handleContinue = async () => {
    setIdeaError('')
    setSubmitError('')
    const trimmed = projectIdea.trim()
    if (!trimmed) {
      setIdeaError('Describe your project in a sentence or two.')
      return
    }
    if (trimmed.length < 4) {
      setIdeaError('Add a bit more detail (at least a few words).')
      return
    }

    setSubmitting(true)
    try {
      const callback = `/card?sentence=${encodeURIComponent(trimmed)}`
      if (session) {
        router.push(callback)
      } else {
        router.push(`/auth/signup?type=project&callbackUrl=${encodeURIComponent(callback)}`)
      }
    } catch {
      setSubmitError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-nexus.jpeg" alt="Nexus" className="h-9 sm:h-10 w-auto max-w-[200px] object-contain object-left" />
            </Link>
            <div className="flex items-center gap-4">
              {session ? (
                <Link
                  href="/project"
                  className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-gray-900 font-medium rounded-lg transition-colors text-sm"
                >
                  My Projects
                </Link>
              ) : (
                <Link href="/auth/signin?type=person" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 sm:px-7 sm:py-3 rounded-full bg-teal-500/10 border-2 border-teal-500/40 text-teal-300 text-sm sm:text-base md:text-lg font-semibold mb-8 max-w-[95vw]">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 shrink-0" />
            <span className="leading-snug text-left sm:text-center">Project-Oriented Collaboration for Creators</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-teal-400">Build real projects.</span>
            <br />
            <span className="text-amber-400">Find the right collaborators.</span>
            <br />
            <span className="text-cyan-400">Ship faster.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A project-first profile system that helps you showcase real work, attract the right people, and move from idea to execution.
          </p>
          <p className="mt-3 text-base text-gray-500 max-w-2xl mx-auto">
            Films. Documentaries. Music. Podcasts. Interviews. Research. Nexus helps you connect, collaborate, and execute across disciplines and platforms.
          </p>
        </section>

        <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-white/10 rounded-3xl p-8 sm:p-10 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-center mb-1">What project do you want to do?</h2>
            <p className="text-sm text-gray-400 text-center mb-6">
              One sentence or a short paragraph is enough. Each visit starts fresh.
            </p>

            <div className="space-y-4">
              <textarea
                id="project-idea-input"
                value={projectIdea}
                onChange={(e) => {
                  setProjectIdea(e.target.value)
                  setIdeaError('')
                  setSubmitError('')
                }}
                rows={5}
                placeholder="e.g. A short climate documentary for youth / An AI interview podcast / Urban music EP with local artists…"
                className={`w-full px-4 py-3 bg-gray-800/50 border ${
                  ideaError ? 'border-red-500' : 'border-gray-700'
                } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-y min-h-[120px]`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleContinue()
                }}
              />
              {ideaError && <p className="text-red-400 text-sm">{ideaError}</p>}
              {submitError && <p className="text-red-400 text-sm">{submitError}</p>}
              <button
                type="button"
                disabled={submitting || !projectIdea.trim()}
                onClick={() => void handleContinue()}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-gray-900 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {submitting ? '…' : 'Continue'}
                {!submitting && <ArrowRight className="w-5 h-5" />}
              </button>
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
