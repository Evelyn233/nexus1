'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function ForceRedirectTest() {
  const [status, setStatus] = useState('')

  const testForceRedirect = () => {
    setStatus('测试强制跳转...')
    
    // 测试各种强制跳转方法
    console.log('🔄 测试1: window.location.href')
    window.location.href = '/home'
    
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        console.log('🔄 测试2: window.location.assign')
        window.location.assign('/home')
      }
    }, 1000)
    
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        console.log('🔄 测试3: window.location.replace')
        window.location.replace('/home')
      }
    }, 2000)
    
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        console.log('🔄 测试4: document.location')
        document.location = '/home'
      }
    }, 3000)
    
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        console.log('🔄 测试5: 创建链接并点击')
        const link = document.createElement('a')
        link.href = '/home'
        link.click()
      }
    }, 4000)
    
    setTimeout(() => {
      if (window.location.pathname !== '/home') {
        console.log('🔄 测试6: 使用 history.pushState')
        window.history.pushState(null, '', '/home')
        window.location.reload()
      }
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">强制跳转测试</h1>
        
        <div className="mb-4">
          <button
            onClick={testForceRedirect}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            测试强制跳转到 /home
          </button>
        </div>
        
        <div className="p-3 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-2">状态:</div>
          <div>{status || '等待测试...'}</div>
        </div>
        
        <div className="mt-4 text-xs text-gray-600">
          <div>当前路径: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
          <div>目标路径: /home</div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <div>测试方法:</div>
          <div>1. window.location.href</div>
          <div>2. window.location.assign</div>
          <div>3. window.location.replace</div>
          <div>4. document.location</div>
          <div>5. 创建链接并点击</div>
          <div>6. history.pushState + reload</div>
        </div>
      </div>
    </div>
  )
}
