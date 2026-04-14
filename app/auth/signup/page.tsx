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
  const isProject = searchParams.get('type') === 'project'
  // Parse display name and link suffix from callbackUrl (e.g. landing → profile?linkSuffix=&name=)
  const linkSuffixFromCallback = (() => {
    if (!callbackUrl || !callbackUrl.startsWith('/')) return ''
    try {
      const url = new URL(callbackUrl, 'http://dummy')
      return url.searchParams.get('linkSuffix')?.trim() || ''
    } catch {
      return ''
    }
  })()
  const nameFromCallback = (() => {
    if (!callbackUrl || !callbackUrl.startsWith('/')) return ''
    try {
      const url = new URL(callbackUrl, 'http://dummy')
      return url.searchParams.get('name')?.trim() || ''
    } catch {
      return ''
    }
  })()
  const [name, setName] = useState(nameFromCallback || linkSuffixFromCallback)
  const [error, setError] = useState('')
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  useEffect(() => {
    if (nameFromCallback) setName(nameFromCallback)
    else setName((prev) => prev || linkSuffixFromCallback || '')
  }, [linkSuffixFromCallback, nameFromCallback])

  // 如果已登录，直接跳转到对应页面
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return

    // 如果有明确的 callbackUrl 且不是 auth 相关页面，跳转到 callbackUrl
    if (callbackUrl && !callbackUrl.includes('/auth/') && !forceSignup) {
      window.location.href = callbackUrl
      return
    }

    // 否则根据用户类型跳转
    const userType = (session?.user as { userType?: string })?.userType
    const targetUrl = userType === 'project' ? '/project' : '/profile'

    // 避免重复跳转
    if (!window.location.pathname.startsWith('/auth/')) return

    window.location.href = targetUrl
  }, [status, session, callbackUrl, forceSignup])

  const handleGoogleSignIn = async () => {
    setError('')
    setIsGoogleLoading(true)
    try {
      const result = await signIn('google', {
        callbackUrl: callbackUrl || (isProject ? '/project' : '/profile'),
        redirect: false,
      })
      if (result?.url) {
        window.location.href = result.url
      } else if (result?.error) {
        setError(result.error)
      }
    } catch {
      setError('Google sign in failed, please try again')
    } finally {
      setIsGoogleLoading(false)
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
              alt="Nexus"
              className="h-14 w-auto max-w-[260px] mx-auto object-contain"
            />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isProject ? 'Create your project account with Google' : 'Sign up with Google'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
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
          )}

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}&type=${isProject ? 'project' : 'person'}` : `/auth/signin${isProject ? '?type=project' : ''}`} className="font-medium text-teal-600 hover:text-teal-500">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

