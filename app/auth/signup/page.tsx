'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPage() {
  const router = useRouter()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setIsLoading(false)
        return
      }

      // 注册成功后自动登录
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/user-info') // 跳转到用户信息收集页面
      } else {
        router.push('/auth/signin')
      }
    } catch (error) {
      setError('注册失败，请稍后重试')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/inflow-logo.jpeg" 
              alt="logo" 
              className="w-24 h-20 rounded-lg"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="您的姓名"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱 *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="your@email.com"
              />
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              我同意{' '}
              <Link href="/terms" className="text-purple-600 hover:text-purple-500">
                服务条款
              </Link>{' '}
              和{' '}
              <Link href="/privacy" className="text-purple-600 hover:text-purple-500">
                隐私政策
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        {/* 登录链接 */}
        <div className="mt-6 space-y-2">
          <p className="text-center text-sm text-gray-600">
            已有账号？{' '}
            <Link href="/auth/signin" className="font-medium text-purple-600 hover:text-purple-500">
              立即登录
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            使用手机号注册？{' '}
            <Link href="/auth/signup-phone" className="font-medium text-purple-600 hover:text-purple-500">
              📱 手机号注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

