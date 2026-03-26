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
  // Parse linkSuffix from callbackUrl (username entered during Create Profile), pre-fill to name
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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  useEffect(() => {
    if (linkSuffixFromCallback && !name) setName(linkSuffixFromCallback)
  }, [linkSuffixFromCallback])

  // If already logged in and callback is get-started, redirect to get-started (Create Project flow)
  // forceSignup=1 prevents auto-redirect, ensuring Personal flow stays on signup page
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

  const handleGoogleSignIn = async () => {
    setError('')
    setIsGoogleLoading(true)
    try {
      const result = await signIn('google', {
        callbackUrl: callbackUrl || '/profile',
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

  const handleSendEmailCode = async () => {
    setError('')
    if (!email) {
      setError('Please enter your email first')
      return
    }
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!EMAIL_REGEX.test(email)) {
      setError('Invalid email format')
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
        setError(data?.error || 'Failed to send verification code')
        return
      }
      setEmailCodeSent(true)
      setEmailCodeCountdown(60)
    } catch {
      setError('Failed to send verification code, please try again later')
    } finally {
      setEmailCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!emailCode) {
      setError('Please request and enter the email verification code')
      return
    }

    // Validate
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      // Register
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, code: emailCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        setIsLoading(false)
        return
      }

      // Auto sign in after registration
      const result = await signIn('credentials', {
        emailOrPhone: email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        if (promptParam) {
          const q = `prompt=${encodeURIComponent(promptParam)}${imageParam ? `&image=${encodeURIComponent(imageParam)}` : ''}&autoStart=true`
          router.push(`/chat-new?${q}`)
        } else if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.includes('/auth/') && !callbackUrl.includes('/user-info')) {
          window.location.href = callbackUrl
        } else {
          window.location.href = '/profile'
        }
      } else {
        router.push('/auth/signin')
      }
    } catch (error) {
      setError('Registration failed, please try again later')
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
            {showEmailForm ? 'Sign Up with Email' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {showEmailForm ? 'Enter your email to register' : 'Start your personal AI assistant journey'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
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
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              Sign Up with Email
            </button>

            {/* Sign in link */}
            <div className="mt-6 space-y-2">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/signin'} className="font-medium text-teal-600 hover:text-teal-500">
                  Sign In
                </Link>
              </p>
              <p className="text-center text-sm text-gray-600">
                Prefer phone?{' '}
                <Link href="/auth/signup-phone" className="font-medium text-teal-600 hover:text-teal-500">
                  Sign up with phone
                </Link>
              </p>
            </div>
          </div>
        ) : (
          /* Email Sign Up Form */
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
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
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
                      {emailCodeCountdown > 0 ? `${emailCodeCountdown}s` : (emailCodeSent ? 'Resend' : 'Send Code')}
                    </button>
                  </div>
                  <div className="mt-2">
                    <label htmlFor="email-code" className="block text-xs font-medium text-gray-600">
                      Verification Code *
                    </label>
                    <input
                      id="email-code"
                      name="email-code"
                      type="text"
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Enter 6-digit code"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password *
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
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                    Confirm Password *
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
                    placeholder="Re-enter password"
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
                  I agree to the{' '}
                  <Link href="/terms" className="text-teal-600 hover:text-teal-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-teal-600 hover:text-teal-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>

            {/* Sign in link */}
            <div className="mt-6 space-y-2">
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href={callbackUrl ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/signin'} className="font-medium text-teal-600 hover:text-teal-500">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

