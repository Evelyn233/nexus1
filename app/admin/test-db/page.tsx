'use client'

import { useState } from 'react'

export default function TestDbPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDatabase = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/view-users')
      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({
        success: false,
        error: '请求失败',
        details: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">数据库连接测试</h1>
        
        <button
          onClick={testDatabase}
          disabled={loading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 mb-6"
        >
          {loading ? '测试中...' : '🔍 测试数据库连接'}
        </button>

        {result && (
          <div className={`rounded-lg p-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h2 className={`text-xl font-bold mb-4 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? '✅ 测试成功' : '❌ 测试失败'}
            </h2>
            
            <div className="space-y-2">
              <p><strong>总用户数：</strong>{result.totalUsers ?? '未知'}</p>
              
              {result.users && result.users.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">用户列表：</p>
                  <ul className="list-disc list-inside space-y-1">
                    {result.users.map((user: any) => (
                      <li key={user.id}>
                        {user.name || '未设置姓名'} ({user.email || user.phone || '无联系方式'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.error && (
                <div className="mt-4">
                  <p className="font-semibold text-red-800">错误信息：</p>
                  <p className="text-sm">{result.error}</p>
                  {result.details && (
                    <p className="text-xs mt-2 text-gray-600">{result.details}</p>
                  )}
                  {result.suggestion && (
                    <div className="mt-4 p-3 bg-yellow-100 rounded">
                      <p className="font-semibold text-yellow-800">建议：</p>
                      <p className="text-sm text-yellow-700 whitespace-pre-line">{result.suggestion}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">查看完整响应数据</summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}






















