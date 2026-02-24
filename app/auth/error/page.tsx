'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      setError(errorParam)
    }
  }, [searchParams])

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'Configuration':
        return '认证配置错误，请检查服务器设置'
      case 'AccessDenied':
        return '访问被拒绝'
      case 'Verification':
        return '验证失败'
      case 'Default':
        return '认证过程中发生错误'
      default:
        return '未知错误'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">认证错误</h1>
          <p className="text-gray-600 mb-6">
            {error ? getErrorMessage(error) : '发生未知错误'}
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors duration-200 block text-center"
            >
              重新登录
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 block text-center"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
