'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUpPhonePage() {
  const router = useRouter()
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [devCode, setDevCode] = useState('') // 开发环境显示验证码

  // 发送验证码
  const handleSendCode = async () => {
    if (!phone) {
      setError('请输入手机号')
      return
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      setError('手机号格式不正确')
      return
    }
    
    setError('')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, type: 'register' }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || '发送验证码失败')
        setIsLoading(false)
        return
      }
      
      // 开发环境显示验证码
      if (data.dev_code) {
        setDevCode(data.dev_code)
      }
      
      setCodeSent(true)
      setCountdown(60)
      
      // 倒计时
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      alert('验证码已发送（开发环境：验证码为 ' + data.dev_code + '）')
      
    } catch (error) {
      setError('发送验证码失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 提交注册
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
    
    if (!codeSent || !code) {
      setError('请先获取并输入验证码')
      return
    }

    setIsLoading(true)

    try {
      // 注册
      const response = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, phone, password, code }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '注册失败')
        setIsLoading(false)
        return
      }

      // 注册成功后自动登录（使用手机号）
      // 注意：需要更新NextAuth配置支持手机号登录
      alert('注册成功！请使用手机号登录')
      router.push('/auth/signin')
      
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
              className="w-24 h-20 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/home')}
            />
          </div>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">📱 手机号注册</h2>
          <p className="mt-2 text-sm text-gray-600">
            使用手机号快速创建账号
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {/* 开发环境：显示验证码 */}
        {devCode && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            <p className="font-bold">开发环境 - 验证码：{devCode}</p>
            <p className="text-xs mt-1">（生产环境不会显示）</p>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="您的姓名（可选）"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                手机号 *
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  placeholder="请输入手机号"
                  maxLength={11}
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
                >
                  {countdown > 0 ? `${countdown}秒后重试` : codeSent ? '重新发送' : '发送验证码'}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                验证码 *
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="请输入6位验证码"
                maxLength={6}
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
              我同意服务条款和隐私政策
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
            使用邮箱注册？{' '}
            <Link href="/auth/signup" className="font-medium text-purple-600 hover:text-purple-500">
              邮箱注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}








