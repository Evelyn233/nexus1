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
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start your personal AI assistant journey
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Sign up form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
          <p className="text-center text-sm text-gray-600">
            Prefer phone?{' '}
            <Link href="/auth/signup-phone" className="font-medium text-teal-600 hover:text-teal-500">
              Sign up with phone
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

