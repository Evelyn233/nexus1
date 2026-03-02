'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function LandingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [leftPrompt, setLeftPrompt] = useState('')
  const [leftFile, setLeftFile] = useState<File | null>(null)
  const [rightPrompt, setRightPrompt] = useState('')

  const handleLeftSubmit = async () => {
    const prompt = leftPrompt.trim() || 'Help me create my profile'
    const go = (img?: string) => {
      const q = `prompt=${encodeURIComponent(prompt)}${img ? `&image=${encodeURIComponent(img)}` : ''}`
      if (session) router.push(`/chat-new?${q}&autoStart=true`)
      else router.push(`/auth/signup?${q}`)
    }
    if (leftFile) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(r.result as string)
          r.onerror = () => reject(new Error('read failed'))
          r.readAsDataURL(leftFile)
        })
        const res = await fetch('/api/image/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: dataUrl, filename: leftFile.name })
        })
        if (!res.ok) { alert('Image upload failed'); return }
        const data = await res.json()
        if (data?.url) { go(data.url); setLeftFile(null); setLeftPrompt('') } else { alert('Image upload failed'); return }
      } catch (e) {
        console.error(e)
        alert('Failed, please try again')
      }
    } else {
      go()
      setLeftPrompt('')
    }
  }

  const handleRightSubmit = () => {
    const prompt = rightPrompt.trim() || 'Generate my profile with AI'
    if (session) router.push(`/chat-new?prompt=${encodeURIComponent(prompt)}&autoStart=true`)
    else router.push(`/auth/signup?prompt=${encodeURIComponent(prompt)}`)
    setRightPrompt('')
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
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-teal-400">Project-Driven Collaboration</span>{' '}
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
          <div className="mt-12 max-w-2xl mx-auto rounded-xl overflow-hidden border border-white/10 bg-white/5">
            <img src="/elon-ex.jpeg" alt="Nexus profile preview" className="w-full h-auto object-cover opacity-90" />
          </div>
        </section>

        {/* Key Features */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10">Key Features</h2>
            <p className="text-center text-gray-400 mb-10">Built for project-driven collaboration: show your work, signal what you need, and find people who can contribute.</p>
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

        {/* Build your profile — 上传照片 + 对话框 / 纯 AI */}
        <section className="border-y border-white/10 py-16 sm:py-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">
              Build Your Profile
            </h2>
            <p className="text-center text-gray-400 mb-12">
              Upload a photo and describe yourself, or let AI generate a profile from a prompt.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
                <img src="/elon-ex.jpeg" alt="Upload your photo" className="w-full h-48 object-cover opacity-90" />
                <div className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-300">Upload your photo + describe</p>
                  <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-dashed border-white/20 text-gray-400 text-sm cursor-pointer hover:bg-white/10 transition-colors">
                    <span>📷</span>
                    <span>Choose image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setLeftFile(f); e.target.value = '' }} />
                  </label>
                  {leftFile && <p className="text-xs text-teal-400 truncate">{leftFile.name}</p>}
                  <input type="text" value={leftPrompt} onChange={(e) => setLeftPrompt(e.target.value)} placeholder="Describe yourself (optional)..." className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button onClick={handleLeftSubmit} className="w-full py-2.5 text-sm font-medium bg-teal-500 text-gray-900 rounded-xl hover:bg-teal-400 transition-colors">Generate Profile</button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
                <img src="/elon-ex2.jpeg" alt="Pure AI" className="w-full h-48 object-cover opacity-90" />
                <div className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-300">Pure AI generation</p>
                  <input type="text" value={rightPrompt} onChange={(e) => setRightPrompt(e.target.value)} placeholder="Describe the profile you want..." className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  <button onClick={handleRightSubmit} className="w-full py-2.5 text-sm font-medium bg-teal-500 text-gray-900 rounded-xl hover:bg-teal-400 transition-colors">Generate Profile</button>
                </div>
              </div>
            </div>
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
