'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
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

  // 显示落地页，不自动跳转
  useEffect(() => {
    if (status === 'unauthenticated') {
      setShowPage(true)
    } else if (status === 'authenticated') {
      setShowPage(true) // 已登录也显示落地页，但导航栏会显示不同内容
    }
  }, [status, router])

  // 设置超时，避免无限加载
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPage(true)
    }, 2000) // 2秒超时

    return () => clearTimeout(timer)
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
  
  if (passwordVerified === null) {
    // 正在检查密码验证状态
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    )
  }
  
  if (passwordVerified !== 'true') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">inflow</h1>
            <p className="text-white/70">请输入访问密码</p>
          </div>

          {/* Password Form */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  访问密码
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="请输入密码"
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
                className="w-full bg-white text-purple-900 py-3 px-6 rounded-xl font-semibold hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              >
                进入应用
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-white/50 text-sm">
              © 2024 inflow. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 正在检查登录状态
  if (!showPage) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在加载...</p>
      </div>
      </div>
    )
  }

  // 显示落地页
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 导航栏 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                inflow
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/auth/signin"
                className="px-4 py-2 text-gray-700 hover:text-purple-600 transition-colors"
              >
                登录
              </Link>
              <Link
                href="/auth/signup"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                注册
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
            用AI创造你的
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
              专属故事
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            输入"我今天上班很伤心"，AI会通过对话深入了解你，
            将你的情绪和经历转化为视觉化的场景和心理剧。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
              开始创作
            </Link>
            <Link
              href="/auth/signin"
              className="px-8 py-4 bg-white text-purple-600 text-lg rounded-xl hover:bg-gray-50 transition-colors shadow-lg border-2 border-purple-600"
            >
              已有账号？登录
            </Link>
          </div>
        </div>

        {/* 功能特点 */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">智能对话</h3>
            <p className="text-gray-600">
              AI会通过对话深入了解你的经历、情绪和想法，建立专属的个性档案。
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">场景生成</h3>
            <p className="text-gray-600">
              基于你的输入，AI会生成逻辑连贯的场景序列，并转化为精美的视觉图像。
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">心理剧呈现</h3>
            <p className="text-gray-600">
              将你的情绪和内心戏剧化呈现，用象征性的视觉元素表达潜意识。
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            准备好开始了吗？
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            注册账号，开始你的专属AI创作之旅。用对话和图像，记录你的情绪、故事和成长。
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg rounded-xl hover:opacity-90 transition-opacity shadow-lg"
          >
            免费开始创作
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>© 2024 inflow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
