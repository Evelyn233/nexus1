'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
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

  // 🔥 监听 session 状态变化，如果已登录则跳转（作为备用保障）
  useEffect(() => {
    if (status === 'authenticated' && session && !hasRedirectedRef.current) {
      console.log('🔄 [SIGNIN] 检测到 session 已认证，执行跳转')
      console.log('🔍 [SIGNIN-EFFECT] Session 详情:', { 
        email: session.user?.email, 
        name: session.user?.name 
      })
      
      hasRedirectedRef.current = true
      
      // 🔥 清理 callbackUrl，移除所有查询参数，避免嵌套
      let targetUrl = callbackUrl || '/home'
      
      // 移除查询参数
      if (targetUrl.includes('?')) {
        targetUrl = targetUrl.split('?')[0]
      }
      
      // 确保不是登录页
      if (targetUrl.includes('/auth/signin')) {
        targetUrl = '/home'
      }
      
      // 构建干净的 URL，只添加一个时间戳参数
      const finalUrl = `${targetUrl}?t=${Date.now()}`
      
      console.log('🚀 [SIGNIN-EFFECT] 准备跳转到:', finalUrl)
      console.log('📍 [SIGNIN-EFFECT] 当前URL:', window.location.href)
      console.log('🔍 [SIGNIN-EFFECT] 原始 callbackUrl:', callbackUrl)
      
      // 🔥 构建绝对 URL，确保跳转正确
      const absoluteUrl = finalUrl.startsWith('http') 
        ? finalUrl 
        : `${window.location.origin}${finalUrl}`
      
      console.log('🔗 [SIGNIN-EFFECT] 绝对URL:', absoluteUrl)
      
      // 🔥 立即尝试跳转，不等待（session 已经认证）
      const performRedirect = () => {
        console.log('🚀 [SIGNIN-EFFECT] 开始强制跳转...')
        console.log('📍 [SIGNIN-EFFECT] 跳转到:', absoluteUrl)
        console.log('📍 [SIGNIN-EFFECT] 当前路径:', window.location.pathname)
        console.log('📍 [SIGNIN-EFFECT] 当前完整URL:', window.location.href)
        
        // 先尝试使用 window.location.href（更可靠）
        try {
          console.log('🔄 [SIGNIN-EFFECT] 尝试使用 window.location.href...')
          window.location.href = absoluteUrl
          console.log('✅ [SIGNIN-EFFECT] 已执行 window.location.href')
          
          // 如果1秒后还在登录页，使用 replace
          setTimeout(() => {
            if (window.location.pathname === '/auth/signin') {
              console.log('⚠️ [SIGNIN-EFFECT] href 未生效，尝试 window.location.replace')
              window.location.replace(absoluteUrl)
            }
          }, 1000)
        } catch (e) {
          console.error('❌ [SIGNIN-EFFECT] window.location.href 失败，尝试 window.location.replace:', e)
          try {
            window.location.replace(absoluteUrl)
          } catch (e2) {
            console.error('❌ [SIGNIN-EFFECT] window.location.replace 也失败:', e2)
            // 最后尝试直接赋值
            window.location = absoluteUrl as any
          }
        }
      }
      
      // 立即执行一次跳转
      performRedirect()
      
      // 同时更新 session，确保 cookie 同步
      update().catch(err => {
        console.warn('⚠️ [SIGNIN-EFFECT] Session 更新失败，继续跳转:', err)
      })
      
      // 备用方案：如果1秒后还在登录页，再次强制跳转
      setTimeout(() => {
        if (window.location.pathname === '/auth/signin') {
          console.log('⚠️ [SIGNIN-EFFECT] 1秒后仍在登录页，再次强制跳转')
          performRedirect()
        }
      }, 1000)
      
      // 最终备用方案：如果3秒后还在登录页，最后一次强制跳转
      setTimeout(() => {
        if (window.location.pathname === '/auth/signin') {
          console.log('⚠️ [SIGNIN-EFFECT] 3秒后仍在登录页，最后一次强制跳转')
          window.location.href = absoluteUrl
        }
      }, 3000)
    }
  }, [status, session, callbackUrl, update])

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
      console.log('🔍 [SIGNIN] 开始登录请求...', { email: email.substring(0, 3) + '***' })
      
      const result = await signIn('credentials', {
        emailOrPhone: email,
        password,
        redirect: false,
      })

      clearTimeout(timeoutId)

      if (!isMountedRef.current) {
        console.log('⚠️ [SIGNIN] 组件已卸载，取消后续操作')
        return
      }

      console.log('🔍 [SIGNIN] 登录API响应:', { 
        ok: result?.ok, 
        error: result?.error, 
        status: result?.status,
        url: result?.url 
      })

      if (result?.error) {
        console.error('❌ [SIGNIN] 登录失败:', result.error)
        setError('Email or password is incorrect')
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        console.log('✅ [SIGNIN] 登录API返回成功，开始处理跳转')
        hasRedirectedRef.current = true // 标记已跳转，防止useEffect再次跳转
        
        // 🔥 清理 callbackUrl，移除所有查询参数，避免嵌套
        let targetUrl = callbackUrl || '/home'
        
        // 移除查询参数
        if (targetUrl.includes('?')) {
          targetUrl = targetUrl.split('?')[0]
        }
        
        // 确保不是登录页
        if (targetUrl.includes('/auth/signin')) {
          targetUrl = '/home'
        }
        
        console.log('🚀 [SIGNIN] 目标URL:', targetUrl)
        console.log('🔍 [SIGNIN] 原始 callbackUrl:', callbackUrl)
        
        // 刷新 session 多次，确保 cookie 完全设置
        try {
          console.log('🔄 [SIGNIN] 开始更新session...')
          await update()
          console.log('✅ [SIGNIN] Session更新成功')
          
          // 再次更新，确保 cookie 同步
          await new Promise(resolve => setTimeout(resolve, 500))
          await update()
          console.log('✅ [SIGNIN] Session二次更新完成')
        } catch (updateError) {
          console.warn('⚠️ [SIGNIN] Session更新失败，继续跳转:', updateError)
        }
        
        // 🔥 等待更长时间确保session cookie已完全设置并同步到middleware
        // 在Vercel上，cookie同步可能需要更长时间
        console.log('⏳ [SIGNIN] 等待session完全同步（3秒）...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        console.log('✅ [SIGNIN] Session同步完成')
        
        // 先设置loading为false
        setIsLoading(false)
        
        // 🔥 使用 window.location.replace 强制跳转（不会在历史记录中留下登录页）
        // 构建干净的 URL，只添加一个时间戳参数
        const finalUrl = `${targetUrl}?t=${Date.now()}`
        
        // 🔥 构建绝对 URL，确保跳转正确
        const absoluteUrl = finalUrl.startsWith('http') 
          ? finalUrl 
          : `${window.location.origin}${finalUrl}`
        
        console.log('🚀 [SIGNIN] 开始强制跳转...')
        console.log('📍 [SIGNIN] 当前URL:', window.location.href)
        console.log('📍 [SIGNIN] 目标URL:', absoluteUrl)
        
        // 直接使用 window.location.replace，确保跳转
        try {
          window.location.replace(absoluteUrl)
          console.log('✅ [SIGNIN] 已执行 window.location.replace')
        } catch (e) {
          console.error('❌ [SIGNIN] window.location.replace 失败，尝试 window.location.href:', e)
          window.location.href = absoluteUrl
        }
        
        // 备用方案：如果2秒后还在登录页，再次强制跳转
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('⚠️ [SIGNIN] 2秒后仍在登录页，再次强制跳转')
            window.location.replace(absoluteUrl)
          }
        }, 2000)
        
        // 最终备用方案：如果5秒后还在登录页，最后一次强制跳转
        setTimeout(() => {
          if (window.location.pathname === '/auth/signin') {
            console.log('⚠️ [SIGNIN] 5秒后仍在登录页，最后一次强制跳转')
            window.location.href = absoluteUrl
          }
        }, 5000)
      } else {
        console.error('❌ [SIGNIN] 登录响应异常:', result)
        setError(result?.error || 'Login response was unexpected')
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

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
