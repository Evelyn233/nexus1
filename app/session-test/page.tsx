'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function SessionTest() {
  const { data: session, status } = useSession()
  const [redirectResult, setRedirectResult] = useState('')

  const testRedirect = () => {
    setRedirectResult('正在尝试跳转到 /home...')
    console.log('🔄 尝试跳转到 /home')
    
    // 尝试跳转
    window.location.href = '/home'
    
    // 检查结果
    setTimeout(() => {
      if (window.location.pathname === '/home') {
        setRedirectResult('✅ 成功跳转到 /home')
      } else {
        setRedirectResult(`❌ 跳转失败，当前路径: ${window.location.pathname}`)
      }
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Session 状态测试</h1>
        
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <div className="font-semibold mb-2">Session 状态:</div>
          <div className="text-sm">
            <div>状态: {status}</div>
            <div>已登录: {session ? '是' : '否'}</div>
            {session && (
              <>
                <div>邮箱: {session.user?.email}</div>
                <div>姓名: {session.user?.name}</div>
                <div>ID: {session.user?.id}</div>
              </>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <button
            onClick={testRedirect}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            测试跳转到 /home
          </button>
        </div>
        
        <div className="p-3 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-2">跳转结果:</div>
          <div>{redirectResult || '等待测试...'}</div>
        </div>
        
        <div className="mt-4 text-xs text-gray-600">
          <div>当前路径: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
        </div>
      </div>
    </div>
  )
}
