'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/home'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 添加超时机制
    const timeoutId = setTimeout(() => {
      console.log('⏰ [SIGNIN] 登录超时')
      setError('Login timeout, please try again')
      setIsLoading(false)
    }, 15000) // 15秒超时

    try {
      console.log('🔍 [SIGNIN] 开始登录:', email)
      
      const result = await signIn('credentials', {
        emailOrPhone: email,
        password,
        redirect: false,
      })

      clearTimeout(timeoutId) // 清除超时
      console.log('📊 [SIGNIN] 登录结果:', result)

      if (result?.error) {
        console.log('❌ [SIGNIN] 登录失败:', result.error)
        setError('Email or password is incorrect')
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        console.log('✅ [SIGNIN] 登录成功，跳转到:', callbackUrl)
        
        // 尝试多种跳转方式
        console.log('🔄 [SIGNIN] 尝试 window.location.href 跳转')
        try {
          window.location.href = callbackUrl
        } catch (e) {
          console.error('❌ [SIGNIN] window.location.href 失败:', e)
        }
        
        // 备用方案1: 使用 window.location.replace
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('🔄 [SIGNIN] 使用 window.location.replace 作为备用')
            try {
              window.location.replace(callbackUrl)
            } catch (e) {
              console.error('❌ [SIGNIN] window.location.replace 失败:', e)
            }
          }
        }, 500)
        
        // 备用方案2: 使用 router.replace
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('🔄 [SIGNIN] 使用 router.replace 作为备用')
            try {
              router.replace(callbackUrl)
            } catch (e) {
              console.error('❌ [SIGNIN] router.replace 失败:', e)
            }
          }
        }, 1000)
        
        // 备用方案3: 强制刷新页面
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('🔄 [SIGNIN] 强制刷新页面')
            window.location.reload()
          }
        }, 2000)
        
      } else {
        console.log('⚠️ [SIGNIN] 登录结果异常:', result)
        setError('Login response was unexpected')
        setIsLoading(false)
      }
    } catch (error) {
      clearTimeout(timeoutId) // 清除超时
      console.error('❌ [SIGNIN] 登录异常:', error)
      setError('Sign in failed, please try again')
      setIsLoading(false)
    }
  }

  // OAuth 登录
  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      console.log('🔍 [SIGNIN] OAuth 登录:', provider)
      await signIn(provider, { callbackUrl })
    } catch (error) {
      console.error('❌ [SIGNIN] OAuth 登录失败:', error)
      setError(`${provider} login failed, please try again`)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/inflow-logo.jpeg" 
              alt="logo" 
              className="w-28 h-22 rounded-lg"
            />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 登录表单 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-teal-600 hover:text-teal-500">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* OAuth 登录 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <span>Google</span>
            </button>

            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <span>GitHub</span>
            </button>
          </div>
        </div>

        {/* 注册链接 */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-teal-600 hover:text-teal-500">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  )
}

