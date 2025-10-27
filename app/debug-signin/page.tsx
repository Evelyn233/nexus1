'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function DebugSignin() {
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testSignin = async () => {
    setIsLoading(true)
    setStatus('开始测试登录...')
    
    try {
      console.log('🔍 开始登录测试')
      
      const result = await signIn('credentials', {
        emailOrPhone: '595674464@qq.com',
        password: '123456',
        redirect: false,
      })
      
      console.log('📊 登录结果:', result)
      setStatus(`登录结果: ${JSON.stringify(result)}`)
      
      if (result?.ok) {
        setStatus('✅ 登录成功！准备跳转...')
        console.log('🔄 尝试跳转到 /home')
        
        // 测试不同的跳转方式
        setTimeout(() => {
          console.log('🔄 方式1: window.location.href')
          window.location.href = '/home'
        }, 1000)
        
        setTimeout(() => {
          if (window.location.pathname !== '/home') {
            console.log('🔄 方式2: window.location.assign')
            window.location.assign('/home')
          }
        }, 2000)
        
        setTimeout(() => {
          if (window.location.pathname !== '/home') {
            console.log('🔄 方式3: window.location.replace')
            window.location.replace('/home')
          }
        }, 3000)
        
      } else {
        setStatus(`❌ 登录失败: ${result?.error}`)
      }
      
    } catch (error) {
      console.error('❌ 登录异常:', error)
      setStatus(`❌ 登录异常: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">登录调试页面</h1>
        
        <div className="mb-4">
          <button
            onClick={testSignin}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '测试中...' : '测试登录和跳转'}
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
        
        <div className="mt-4 text-xs text-gray-500">
          <div>测试步骤:</div>
          <div>1. 尝试登录</div>
          <div>2. 如果成功，尝试3种跳转方式</div>
          <div>3. 查看控制台日志</div>
        </div>
      </div>
    </div>
  )
}
