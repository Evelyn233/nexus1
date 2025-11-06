'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignInPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/home'
  const isMountedRef = useRef(true)
  const { data: session, status, update } = useSession()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const hasRedirectedRef = useRef(false) // 🔥 防止重复跳转

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 🔥 如果用户已登录，让 middleware 处理跳转（这里不自动跳转，避免循环）
  // 只在页面首次加载时检查，如果是已登录状态，让middleware重定向
  useEffect(() => {
    // 如果已经跳转过，不再处理
    if (hasRedirectedRef.current) return
    
    // 如果正在加载中或正在登录，不处理
    if (isLoading) return
    
    // 如果用户已登录，但还在登录页面，可能是刚登录成功
    // 让登录成功后的逻辑处理跳转，这里不做任何操作
    if (status === 'authenticated' && session) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
      if (currentPath === '/auth/signin') {
        // 只记录日志，不跳转（让登录成功后的逻辑或middleware处理）
        console.log('ℹ️ [SIGNIN] 检测到已登录状态，等待登录成功逻辑或middleware处理跳转')
      }
    }
  }, [status, session, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        setError('Login timeout, please try again')
        setIsLoading(false)
      }
    }, 15000)

    try {
      const result = await signIn('credentials', {
        emailOrPhone: email,
        password,
        redirect: false,
      })

      clearTimeout(timeoutId)

      if (!isMountedRef.current) return

      if (result?.error) {
        setError('Email or password is incorrect')
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        hasRedirectedRef.current = true // 标记已跳转，防止useEffect再次跳转
        
        // 刷新 session，等待session完全设置
        try {
          await update()
          // 等待更长时间，确保session cookie已完全设置并同步到middleware
          await new Promise(resolve => setTimeout(resolve, 800))
          
          const targetUrl = callbackUrl || '/home'
          console.log('✅ [SIGNIN] 登录成功，session已更新，跳转到:', targetUrl)
          
          // 使用 replace 避免历史记录问题，并添加时间戳确保刷新
          window.location.replace(`${targetUrl}?t=${Date.now()}`)
        } catch (updateError) {
          console.warn('⚠️ [SIGNIN] Session更新失败，直接跳转:', updateError)
          // 即使刷新失败，也尝试跳转（cookie 已设置）
          const targetUrl = callbackUrl || '/home'
          // 等待一下确保cookie已设置
          setTimeout(() => {
            console.log('🔄 [SIGNIN] 强制跳转到:', targetUrl)
            window.location.replace(`${targetUrl}?t=${Date.now()}`)
          }, 1000)
        }
        
        setIsLoading(false)
      } else {
        setError('Login response was unexpected')
        setIsLoading(false)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (isMountedRef.current) {
        console.error('❌ [SIGNIN] 登录异常:', error)
        setError('Sign in failed, please try again')
        setIsLoading(false)
      }
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    if (!isMountedRef.current) return
    
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl })
    } catch (error) {
      if (isMountedRef.current) {
        console.error('❌ [SIGNIN] OAuth 登录失败:', error)
        setError(`${provider} login failed, please try again`)
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

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
