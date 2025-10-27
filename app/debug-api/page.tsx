'use client'

import { useState } from 'react'

export default function DebugApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSeedreamApi = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 测试SeeDream API...')
      
      const response = await fetch('/api/seedream-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'a simple test image'
        })
      })

      console.log('📡 响应状态:', response.status)
      
      const data = await response.json()
      console.log('📄 响应数据:', data)
      
      setResult({
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      })
      
    } catch (err) {
      console.error('❌ 测试失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const testEnvVars = () => {
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      SEEDREAM_API_KEY: process.env.SEEDREAM_API_KEY ? 
        `${process.env.SEEDREAM_API_KEY.substring(0, 8)}...` : 'undefined',
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'undefined'
    }
    
    setResult({
      type: 'env',
      data: envInfo,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API 调试页面</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">SeeDream API 测试</h2>
            <button
              onClick={testSeedreamApi}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试生图API'}
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">环境变量检查</h2>
            <button
              onClick={testEnvVars}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              检查环境变量
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">错误信息</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">测试结果</h3>
            <div className="bg-gray-100 rounded p-4 overflow-auto">
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
