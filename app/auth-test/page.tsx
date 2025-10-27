'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

export default function AuthTestPage() {
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testAuth = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      console.log('🔍 开始测试认证...')
      
      const result = await signIn('credentials', {
        emailOrPhone: '595674464@qq.com',
        password: '123456',
        redirect: false,
      })
      
      console.log('📊 认证结果:', result)
      setResult(result)
      
    } catch (error) {
      console.error('❌ 认证测试失败:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  const testHealth = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      console.log('🏥 健康检查结果:', data)
      setResult(data)
    } catch (error) {
      console.error('❌ 健康检查失败:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Vercel 认证测试</h1>
        
        <div className="space-y-4">
          <button
            onClick={testHealth}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Health Check'}
          </button>
          
          <button
            onClick={testAuth}
            disabled={isLoading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 ml-4"
          >
            {isLoading ? 'Testing...' : 'Test Authentication'}
          </button>
        </div>
        
        {result && (
          <div className="mt-6 p-4 bg-white rounded border">
            <h3 className="font-semibold mb-2">测试结果:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-yellow-50 rounded border">
          <h3 className="font-semibold mb-2">测试说明:</h3>
          <ul className="text-sm space-y-1">
            <li>• Health Check: 检查环境变量和数据库连接</li>
            <li>• Authentication: 测试用户 595674464@qq.com 的登录</li>
            <li>• 查看浏览器控制台获取详细日志</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
