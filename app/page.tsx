'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const [showPage, setShowPage] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // 检查是否已通过密码验证
  useEffect(() => {
    const passwordVerified = localStorage.getItem('passwordVerified')
    if (passwordVerified === 'true') {
      setShowPage(true)
    }
  }, [])

  // 直接显示页面，不依赖任何认证状态
  useEffect(() => {
    setShowPage(true)
  }, [])

  // 处理密码验证
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === '0316') {
      localStorage.setItem('passwordVerified', 'true')
      setPasswordVerified('true')
      setShowPage(true)
    } else {
      setError('密码错误，请重试')
    }
  }

  // 如果未通过密码验证，显示密码输入界面
  const [passwordVerified, setPasswordVerified] = useState<string | null>(null)
  
  useEffect(() => {
    const verified = localStorage.getItem('passwordVerified')
    setPasswordVerified(verified)
  }, [])
  
  // 简化逻辑：直接检查密码验证状态
  if (passwordVerified === null) {
    // 正在检查密码验证状态
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (passwordVerified !== 'true') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-blue-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img 
                src="/inflow-logo.jpeg" 
                alt="logo" 
                className="w-24 h-16 rounded-lg"
              />
            </div>
            <p className="text-white/70">Please enter access password</p>
          </div>

          {/* Password Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Access Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-white text-teal-900 py-3 px-6 rounded-xl font-semibold hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              >
                Enter App
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-white/50 text-sm">
              © 2024 All rights reserved.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 简化逻辑：如果通过密码验证，直接显示落地页
  // 移除复杂的showPage逻辑

  // 显示落地页
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img 
                src="/inflow-logo.jpeg" 
                alt="logo" 
                className="w-28 h-20 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-gray-700 hover:text-teal-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Turn your thoughts into
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-cyan-600">
              flowing scenes
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Input "I'm feeling sad at work today" and AI will deeply understand you through conversation,
            transforming your emotions and experiences into visual scenes and psychodrama.
          </p>
          
          {/* 美观的图片展示 */}
          <div className="mb-12">
            <div className="relative max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl p-6 shadow-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Conversation</h3>
                    <p className="text-gray-600 text-sm">AI understands your inner world through deep conversation</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-6 shadow-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Scene Generation</h3>
                    <p className="text-gray-600 text-sm">Transform your stories into beautiful visual scenes</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl p-6 shadow-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Psychodrama</h3>
                    <p className="text-gray-600 text-sm">Deep exploration of your inner world and emotions</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-6 shadow-lg">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Creation</h3>
                    <p className="text-gray-600 text-sm">Create unique personal stories with AI technology</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
              Start Creating
            </Link>
            <Link
              href="/auth/signin"
              className="px-8 py-4 bg-white text-teal-600 text-lg rounded-xl hover:bg-gray-50 transition-colors shadow-lg border-2 border-teal-600"
            >
              Already have an account? Sign In
            </Link>
          </div>
        </div>

        {/* 功能特点 */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Conversation</h3>
            <p className="text-gray-600">
              AI deeply understands your experiences, emotions, and thoughts through conversation, building a personalized profile.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Scene Generation</h3>
            <p className="text-gray-600">
              Based on your input, AI generates logically coherent scene sequences and transforms them into beautiful visual images.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Psychodrama Presentation</h3>
            <p className="text-gray-600">
              Dramatize your emotions and inner world, expressing subconscious through symbolic visual elements.
            </p>
          </div>
        </div>

        {/* 产品展示 */}
        <div className="mb-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            See other users' creations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 shadow-lg">
              <div className="w-full h-48 rounded-xl mb-4 overflow-hidden">
                <img 
                  src="/generated-images/generated-1759673194234.jpg" 
                  alt="Emotional scene" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">"I'm feeling sad at work today"</h4>
              <p className="text-sm text-gray-600 mb-4">AI transforms user's emotions into visual scenes, revealing inner world</p>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <div className="w-6 h-6 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">E</span>
                </div>
                <span className="text-sm text-gray-600">Evelyn</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-lg">
              <div className="w-full h-48 rounded-xl mb-4 overflow-hidden">
                <img 
                  src="/images/magazine.jpeg" 
                  alt="Opinion scene" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">"China lacks a high-end magazine market"</h4>
              <p className="text-sm text-gray-600 mb-4">Illustration style showcasing user's deep thoughts on social phenomena</p>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">A</span>
                </div>
                <span className="text-sm text-gray-600">Alex</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg">
              <div className="w-full h-48 rounded-xl mb-4 overflow-hidden">
                <img 
                  src="/images/intellectual.jpeg" 
                  alt="Intellectual scene" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">"Intellectual Thinking"</h4>
              <p className="text-sm text-gray-600 mb-4">Showcasing user's deep thinking and intellectual exploration of inner world</p>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="text-sm text-gray-600">Sophie</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-6 shadow-lg">
              <div className="w-full h-48 rounded-xl mb-4 overflow-hidden">
                <img 
                  src="/images/work.jpeg" 
                  alt="Work scene" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">"I'm so tired at work"</h4>
              <p className="text-sm text-gray-600 mb-4">Visual expression of modern workplace fatigue and pressure</p>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-slate-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">M</span>
                </div>
                <span className="text-sm text-gray-600">Mike</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl shadow-lg p-12 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to get started?
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Sign up and begin your exclusive AI creation journey. Use conversation and images to record your emotions, stories, and growth.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg"
          >
            Start Creating for Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
