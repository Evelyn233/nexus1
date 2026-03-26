'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { signIn, useSession, getSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function getSignInErrorMessage(error: string | undefined): string {
  if (!error) return '登录失败，请重试'
  if (error === '请您先注册') return '请您先注册'
  if (error === '该账号通过第三方登录，请使用 Google/GitHub 登录') return error
  if (error === '账号或密码错误') return '账号或密码错误'
  if (error === 'CredentialsSignin') return '账号或密码错误'
  return error
}

function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get('callbackUrl') || '/profile'
  const isMountedRef = useRef(true)
  const { data: session, status, update } = useSession()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const hasRedirectedRef = useRef(false) // 🔥 防止重复跳转

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 从 URL 读取错误（如从 /auth/error 跳回时）
  useEffect(() => {
    const err = searchParams.get('error')
    if (err) setError(getSignInErrorMessage(decodeURIComponent(err)))
  }, [searchParams])

  // 🔥 监听 session 状态变化，如果已登录则跳转（作为备用保障）
  useEffect(() => {
    if (status === 'authenticated' && session && !hasRedirectedRef.current) {
      console.log('🔄 [SIGNIN] 检测到 session 已认证，执行跳转')
      console.log('🔍 [SIGNIN-EFFECT] Session 详情:', { 
        email: session.user?.email, 
        name: session.user?.name 
      })
      
      hasRedirectedRef.current = true
      
      let targetUrl = callbackUrl || '/profile'
      const userType = (session?.user as { userType?: string })?.userType
      if ((!callbackUrl || callbackUrl === '/profile') && userType === 'project') targetUrl = '/project'
      
      // 保留 /get-started 的查询参数（type, linkSuffix, name），其他路径移除查询参数
      if (!targetUrl.startsWith('/get-started')) {
        if (targetUrl.includes('?')) {
          targetUrl = targetUrl.split('?')[0]
        }
      }
      
      if (targetUrl.includes('/auth/signin')) {
        targetUrl = userType === 'project' ? '/project' : '/profile'
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
        const msg = getSignInErrorMessage(result.error)
        setError(msg)
        setIsLoading(false)
        return
      }

      if (result?.ok) {
        console.log('✅ [SIGNIN] 登录API返回成功，开始处理跳转')
        hasRedirectedRef.current = true // 标记已跳转，防止useEffect再次跳转
        
        let targetUrl = callbackUrl || '/profile'
        
        // 保留 /get-started 的查询参数，其他路径移除
        if (!targetUrl.startsWith('/get-started')) {
          if (targetUrl.includes('?')) {
            targetUrl = targetUrl.split('?')[0]
          }
        }
        
        if (targetUrl.includes('/auth/signin')) {
          targetUrl = '/profile'
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
        console.log('⏳ [SIGNIN] 等待session完全同步（3秒）...')
        await new Promise(resolve => setTimeout(resolve, 3000))
        console.log('✅ [SIGNIN] Session同步完成')
        
        // 登录后根据 DB 中的 userType 决定默认去向：
        // 通过 /api/user/info 读取 profileData.userType，避免 session 尚未正确带上 userType
        try {
          const infoRes = await fetch('/api/user/info', { credentials: 'include' })
          if (infoRes.ok) {
            const info = await infoRes.json().catch(() => ({} as any))
            const pd = (info?.profileData || {}) as { userType?: string }
            const typeFromDb = pd.userType
            if ((!callbackUrl || callbackUrl === '/profile') && typeFromDb === 'project') {
              targetUrl = '/project'
              console.log('🔄 [SIGNIN] 根据 DB userType=project，重定向到 /project')
            }
          }
        } catch (e) {
          console.warn('⚠️ [SIGNIN] 读取 /api/user/info 失败，按默认 targetUrl 处理', e)
        }
        
        // 先设置loading为false
        setIsLoading(false)
        
        // 🔥 使用 window.location.replace 强制跳转（不会在历史记录中留下登录页）
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
        setError(getSignInErrorMessage(result?.error ?? undefined) || '登录失败，请重试')
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

  const handleGoogleSignIn = async () => {
    if (!isMountedRef.current) return
    setError('')
    setIsGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      if (isMountedRef.current) {
        console.error('❌ [SIGNIN] Google login failed:', error)
        setError('Google sign in failed, please try again')
        setIsGoogleLoading(false)
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
              src="/logo-nexus.jpeg" 
              alt="logo" 
              className="h-20 w-auto object-contain rounded-lg"
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
          <div
            role="alert"
            className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm font-medium"
          >
            {error}
          </div>
        )}

        {!showEmailForm ? (
          /* Google Sign In - Primary Option */
          <div className="space-y-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGoogleLoading ? (
                <span className="text-gray-500">Signing in...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span className="text-gray-700 font-medium">Continue with Google</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              Sign In with Email
            </button>

            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href={callbackUrl ? `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/signup'} className="font-medium text-teal-600 hover:text-teal-500">
                Sign up now
              </Link>
            </p>
          </div>
        ) : (
          /* Email/Password Sign In Form */
          <div>
            <button
              onClick={() => setShowEmailForm(false)}
              className="mb-4 text-sm text-teal-600 hover:text-teal-500 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Google Sign In
            </button>

            <form className="space-y-6" onSubmit={handleSubmit}>
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

            <p className="mt-6 text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href={callbackUrl ? `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/signup'} className="font-medium text-teal-600 hover:text-teal-500">
                Sign up now
              </Link>
            </p>
          </div>
        )}
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
