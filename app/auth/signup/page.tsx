'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const promptParam = searchParams.get('prompt') || ''
  const imageParam = searchParams.get('image') || ''
  const callbackUrl = searchParams.get('callbackUrl') || ''
  const forceSignup = searchParams.get('forceSignup') === '1'
  // 从 callbackUrl 解析 linkSuffix（Create Profile 时输入的用户名），预填到姓名
  const linkSuffixFromCallback = (() => {
    if (!callbackUrl || !callbackUrl.startsWith('/')) return ''
    try {
      const url = new URL(callbackUrl, 'http://dummy')
      return url.searchParams.get('linkSuffix')?.trim() || ''
    } catch {
      return ''
    }
  })()
  const [name, setName] = useState(linkSuffixFromCallback)
  const [email, setEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailCodeSending, setEmailCodeSending] = useState(false)
  const [emailCodeSent, setEmailCodeSent] = useState(false)
  const [emailCodeCountdown, setEmailCodeCountdown] = useState(0)
  const [devEmailCode, setDevEmailCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (linkSuffixFromCallback && !name) setName(linkSuffixFromCallback)
  }, [linkSuffixFromCallback])

  // 已登录且 callback 是 get-started 时，直接去 get-started（Create Project 流程）
  // forceSignup=1 时不自动跳转，确保 Personal 流程先停留在注册页
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return
    if (!forceSignup && callbackUrl.startsWith('/get-started') && !callbackUrl.includes('/auth/')) {
      window.location.href = callbackUrl
    }
  }, [status, session, callbackUrl, forceSignup])

  useEffect(() => {
    if (!emailCodeCountdown) return
    const timer = setInterval(() => {
      setEmailCodeCountdown((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [emailCodeCountdown])

  const handleSendEmailCode = async () => {
    setError('')
    if (!email) {
      setError('请先填写邮箱')
      return
    }
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_REGEX.test(email)) {
      setError('邮箱格式不正确')
      return
    }
    if (emailCodeCountdown > 0 || emailCodeSending) return

    setEmailCodeSending(true)
    try {
      const res = await fetch('/api/auth/send-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || '验证码发送失败')
        return
      }
      setEmailCodeSent(true)
      setEmailCodeCountdown(60)
      if (data?.dev_code) {
        setDevEmailCode(data.dev_code)
      }
    } catch {
      setError('验证码发送失败，请稍后重试')
    } finally {
      setEmailCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!emailCode) {
      setError('请先获取并输入邮箱验证码（本地测试可填 000000 跳过）')
      return
    }

    // 验证
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码至少需要6个字符')
      return
    }

    setIsLoading(true)

    try {
      // 注册
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, code: emailCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setIsLoading(false)
        return
      }

      // 注册成功后自动登录（CredentialsProvider 期望字段名为 emailOrPhone）
      const result = await signIn('credentials', {
        emailOrPhone: email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        // 新用户注册后直接进入提问/聊天，不强制先建立 profile
        if (promptParam) {
          const q = `prompt=${encodeURIComponent(promptParam)}${imageParam ? `&image=${encodeURIComponent(imageParam)}` : ''}&autoStart=true`
          router.push(`/chat-new?${q}`)
        } else if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.includes('/auth/') && !callbackUrl.includes('/user-info')) {
          // 用整页跳转，确保 get-started 加载时能拿到 session cookie，避免客户端 session 未就绪被重定向回首页
          window.location.href = callbackUrl
        } else {
          window.location.href = '/profile'
        }
      } else {
        router.push('/auth/signin')
      }
    } catch (error) {
      setError('注册失败，请稍后重试')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo-nexus.jpeg" 
              alt="logo" 
              className="h-16 w-auto object-contain rounded-lg"
            />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            创建账号
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            开始您的专属AI生活助手之旅
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 注册表单 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                姓名
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="您的姓名"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱 *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="your@email.com"
                />
                <button
                  type="button"
                  onClick={handleSendEmailCode}
                  disabled={emailCodeSending || emailCodeCountdown > 0}
                  className="px-3 py-2 text-sm rounded-lg border border-teal-500 text-teal-600 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {emailCodeCountdown > 0 ? `${emailCodeCountdown}s 后重试` : (emailCodeSent ? '重新发送' : '发送验证码')}
                </button>
              </div>
              <div className="mt-2">
                <label htmlFor="email-code" className="block text-xs font-medium text-gray-600">
                  邮箱验证码 *
                </label>
                <input
                  id="email-code"
                  name="email-code"
                  type="text"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                  placeholder="请输入6位验证码（本地测试可填 000000）"
                />
                <p className="mt-1 text-xs text-gray-500">
                  本地测试：验证码填 <span className="font-mono font-semibold">000000</span> 可跳过邮箱验证
                </p>
                {devEmailCode && (
                  <p className="mt-1 text-xs text-gray-500">
                    开发环境验证码：<span className="font-mono font-semibold">{devEmailCode}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码 *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="至少6个字符"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                确认密码 *
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="再次输入密码"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              我同意{' '}
              <Link href="/terms" className="text-teal-600 hover:text-teal-500">
                服务条款
              </Link>{' '}
              和{' '}
              <Link href="/privacy" className="text-teal-600 hover:text-teal-500">
                隐私政策
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        {/* 登录链接 */}
        <div className="mt-6 space-y-2">
          <p className="text-center text-sm text-gray-600">
            已有账号？{' '}
            <Link href={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/signin'} className="font-medium text-teal-600 hover:text-teal-500">
              立即登录
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            使用手机号注册？{' '}
            <Link href="/auth/signup-phone" className="font-medium text-teal-600 hover:text-teal-500">
              📱 手机号注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

