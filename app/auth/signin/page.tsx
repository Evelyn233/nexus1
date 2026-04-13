'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { signIn, useSession, getSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function getSignInErrorMessage(error: string | undefined): string {
  if (!error) return '登录失败，请重试'
  if (error === '请您先注册') return '请您先注册'
  if (error === '该账号通过第三方登录，请使用 LinkedIn 或 GitHub 登录') return error
  if (error === '账号或密码错误') return '账号或密码错误'
  if (error === 'CredentialsSignin') return '账号或密码错误'
  return error
}

function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get('callbackUrl') || '/profile'
  const isProject = searchParams.get('type') === 'project'
  const isMountedRef = useRef(true)
  const { data: session, status, update } = useSession()
  
  const [error, setError] = useState('')
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
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

  const handleLinkedInSignIn = async () => {
    if (!isMountedRef.current) return
    setError('')
    setIsLinkedInLoading(true)
    try {
      await signIn('linkedin', { callbackUrl })
    } catch (error) {
      if (isMountedRef.current) {
        console.error('❌ [SIGNIN] LinkedIn login failed:', error)
        setError('LinkedIn sign in failed, please try again')
        setIsLinkedInLoading(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo-nexus.jpeg"
              alt="Nexus"
              className="h-16 w-auto max-w-[280px] mx-auto object-contain"
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

        <div className="space-y-6">
          {isProject ? (
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg shadow-sm bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGoogleLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-medium">Continue with Google</span>
                </>
              )}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleLinkedInSignIn()}
                disabled={isLinkedInLoading || isGoogleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg shadow-sm bg-[#0A66C2] hover:bg-[#004182] text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A66C2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLinkedInLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="font-medium">Continue with LinkedIn</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isGoogleLoading || isLinkedInLoading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg shadow-sm bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGoogleLoading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="font-medium">Continue with Google</span>
                  </>
                )}
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href={callbackUrl ? `/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}&type=${isProject ? 'project' : 'person'}` : `/auth/signup${isProject ? '?type=project' : ''}`} className="font-medium text-teal-600 hover:text-teal-500">
              Sign up now
            </Link>
          </p>
        </div>
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
