'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  const isNetworkError =
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('Load failed')

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 bg-[#0a0f14] text-white">
      <h2 className="text-lg font-semibold text-red-400">
        {isNetworkError ? 'Network / session error' : 'Something went wrong'}
      </h2>
      <p className="text-sm text-gray-400 text-center max-w-md">
        {isNetworkError
          ? 'Session request failed. If you use a different port (e.g. 3001), set NEXTAUTH_URL in .env to match (e.g. http://localhost:3001). Otherwise check your connection and try again.'
          : error?.message || 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium"
      >
        Try again
      </button>
      <a
        href="/"
        className="text-sm text-teal-400 hover:text-teal-300"
      >
        Back to home
      </a>
    </div>
  )
}
