'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'

export default function SimpleAuthTest() {
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const testSimpleAuth = async () => {
    setIsLoading(true)
    setStatus('开始测试...')
    
    try {
      // 1. 测试环境变量
      setStatus('检查环境变量...')
      const envCheck = await fetch('/api/health')
      const envData = await envCheck.json()
      console.log('环境检查:', envData)
      
      if (!envData.checks?.environment?.DATABASE_URL) {
        setStatus('❌ DATABASE_URL 未设置')
        return
      }
      
      // 2. 测试数据库连接
      setStatus('测试数据库连接...')
      if (envData.checks?.database !== 'connected') {
        setStatus('❌ 数据库连接失败')
        return
      }
      
      // 3. 测试认证
      setStatus('测试用户认证...')
      const result = await signIn('credentials', {
        emailOrPhone: '595674464@qq.com',
        password: '123456',
        redirect: false,
      })
      
      console.log('认证结果:', result)
      
      if (result?.error) {
        setStatus(`❌ 认证失败: ${result.error}`)
      } else if (result?.ok) {
        setStatus('✅ 认证成功!')
        
        // 检查 session
        const session = await getSession()
        console.log('Session:', session)
      } else {
        setStatus('❌ 认证结果异常')
      }
      
    } catch (error) {
      console.error('测试失败:', error)
      setStatus(`❌ 测试异常: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-bold mb-4">Vercel 认证诊断</h1>
        
        <div className="mb-4">
          <button
            onClick={testSimpleAuth}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? '测试中...' : '开始诊断'}
          </button>
        </div>
        
        <div className="p-3 bg-gray-50 rounded text-sm">
          <div className="font-semibold mb-2">状态:</div>
          <div className="whitespace-pre-wrap">{status || '等待测试...'}</div>
        </div>
        
        <div className="mt-4 text-xs text-gray-600">
          <div>测试步骤:</div>
          <div>1. 检查环境变量</div>
          <div>2. 测试数据库连接</div>
          <div>3. 测试用户认证</div>
          <div>4. 检查 Session 状态</div>
        </div>
      </div>
    </div>
  )
}
