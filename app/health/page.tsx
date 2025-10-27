'use client'

import { useState, useEffect } from 'react'

export default function HealthCheckPage() {
  const [checks, setChecks] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const runChecks = async () => {
      const results: any = {}

      // 检查环境变量
      results.envVars = {
        DATABASE_URL: process.env.DATABASE_URL ? '✅ 已设置' : '❌ 未设置',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ 已设置' : '❌ 未设置',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ 已设置' : '❌ 未设置',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY ? '✅ 已设置' : '❌ 未设置',
        SEEDREAM_API_KEY: process.env.SEEDREAM_API_KEY ? '✅ 已设置' : '❌ 未设置',
      }

      // 检查API端点
      try {
        const response = await fetch('/api/seedream-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'test' })
        })
        results.seedreamApi = response.ok ? '✅ 正常' : `❌ 错误: ${response.status}`
      } catch (error) {
        results.seedreamApi = `❌ 错误: ${error}`
      }

      // 检查数据库连接
      try {
        const response = await fetch('/api/user/info')
        results.database = response.ok ? '✅ 正常' : `❌ 错误: ${response.status}`
      } catch (error) {
        results.database = `❌ 错误: ${error}`
      }

      // 检查NextAuth
      try {
        const response = await fetch('/api/auth/session')
        results.nextAuth = response.ok ? '✅ 正常' : `❌ 错误: ${response.status}`
      } catch (error) {
        results.nextAuth = `❌ 错误: ${error}`
      }

      setChecks(results)
      setLoading(false)
    }

    runChecks()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在检查系统状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">系统健康检查</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">环境变量</h2>
            <div className="space-y-2">
              {Object.entries(checks.envVars || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600">{key}:</span>
                  <span className={typeof value === 'string' && value.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">API状态</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">SeeDream API:</span>
                <span className={checks.seedreamApi?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {checks.seedreamApi}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">数据库:</span>
                <span className={checks.database?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {checks.database}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">NextAuth:</span>
                <span className={checks.nextAuth?.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                  {checks.nextAuth}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">解决方案</h3>
          <div className="text-blue-700 space-y-2">
            <p>1. 如果环境变量未设置，请在Vercel Dashboard中配置</p>
            <p>2. 如果数据库连接失败，请检查DATABASE_URL是否正确</p>
            <p>3. 如果API失败，请检查API密钥是否有效</p>
            <p>4. 重新部署应用以确保环境变量生效</p>
          </div>
        </div>
      </div>
    </div>
  )
}
