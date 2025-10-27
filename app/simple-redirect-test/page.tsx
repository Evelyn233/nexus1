'use client'

import { useState } from 'react'

export default function SimpleRedirectTest() {
  const [status, setStatus] = useState('')

  const testDirectRedirect = () => {
    setStatus('正在跳转到 /home...')
    console.log('🔄 直接跳转到 /home')
    window.location.assign('/home')
  }

  const testHrefRedirect = () => {
    setStatus('正在使用 href 跳转到 /home...')
    console.log('🔄 使用 href 跳转到 /home')
    window.location.href = '/home'
  }

  const testReplaceRedirect = () => {
    setStatus('正在使用 replace 跳转到 /home...')
    console.log('🔄 使用 replace 跳转到 /home')
    window.location.replace('/home')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">简单跳转测试</h1>
        
        <div className="space-y-2">
          <button
            onClick={testDirectRedirect}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            测试 window.location.assign('/home')
          </button>
          
          <button
            onClick={testHrefRedirect}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            测试 window.location.href = '/home'
          </button>
          
          <button
            onClick={testReplaceRedirect}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            测试 window.location.replace('/home')
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-2">状态:</div>
          <div>{status || '等待测试...'}</div>
        </div>
        
        <div className="mt-4 text-xs text-gray-600">
          <div>当前路径: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
