'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectTestPage() {
  const router = useRouter()
  const [status, setStatus] = useState('')

  const testRedirects = () => {
    setStatus('测试各种跳转方式...')
    
    // 测试1: window.location.href
    setTimeout(() => {
      setStatus('测试 window.location.href...')
      try {
        window.location.href = '/home'
      } catch (e) {
        setStatus(`window.location.href 失败: ${e}`)
      }
    }, 1000)
    
    // 测试2: window.location.replace
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        setStatus('测试 window.location.replace...')
        try {
          window.location.replace('/home')
        } catch (e) {
          setStatus(`window.location.replace 失败: ${e}`)
        }
      }
    }, 2000)
    
    // 测试3: router.push
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        setStatus('测试 router.push...')
        try {
          router.push('/home')
        } catch (e) {
          setStatus(`router.push 失败: ${e}`)
        }
      }
    }, 3000)
    
    // 测试4: 强制刷新
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        setStatus('强制刷新页面...')
        window.location.reload()
      }
    }, 4000)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">跳转测试页面</h1>
        
        <div className="mb-4">
          <button
            onClick={testRedirects}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            开始测试跳转
          </button>
        </div>
        
        <div className="p-3 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-2">状态:</div>
          <div className="whitespace-pre-wrap">{status || '等待测试...'}</div>
        </div>
        
        <div className="mt-4 text-xs text-gray-600">
          <div>当前路径: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
          <div>目标路径: /home</div>
        </div>
      </div>
    </div>
  )
}
