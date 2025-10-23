'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function DebugUserPage() {
  const { data: session } = useSession()
  const [prismaData, setPrismaData] = useState<any>(null)
  const [localStorageData, setLocalStorageData] = useState<any>(null)
  const [syncResult, setSyncResult] = useState<string>('')

  useEffect(() => {
    checkData()
  }, [])

  const checkData = async () => {
    // 1. 检查Prisma数据
    try {
      const response = await fetch('/api/user/info')
      const data = await response.json()
      setPrismaData(data)
      console.log('📊 Prisma数据:', data)
    } catch (error) {
      console.error('获取Prisma数据失败:', error)
    }

    // 2. 检查localStorage数据
    const currentUser = localStorage.getItem('magazine_current_user')
    if (currentUser) {
      const userInfoKey = `magazine_user_info_${currentUser}`
      const metadataKey = `magazine_user_metadata_${currentUser}`
      
      const userInfo = localStorage.getItem(userInfoKey)
      const metadata = localStorage.getItem(metadataKey)
      
      setLocalStorageData({
        currentUser,
        userInfo: userInfo ? JSON.parse(userInfo) : null,
        metadata: metadata ? JSON.parse(metadata) : null
      })
      
      console.log('💾 localStorage数据:', {
        currentUser,
        userInfo: userInfo ? JSON.parse(userInfo) : null
      })
    }
  }

  const syncData = async () => {
    try {
      const response = await fetch('/api/user/sync', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        setSyncResult('✅ 同步成功！刷新页面查看更新...')
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setSyncResult(`❌ 同步失败: ${data.error}`)
      }
    } catch (error) {
      setSyncResult(`❌ 同步失败: ${error}`)
    }
  }

  const fixPrismaData = async () => {
    try {
      // 从localStorage获取数据
      if (!localStorageData?.userInfo) {
        // localStorage为空，直接跳到重新生成元数据
        setSyncResult('ℹ️ localStorage为空，直接重新生成元数据...')
        await regenerateMetadataOnly()
        return
      }

      setSyncResult('🔧 步骤1/2：正在修复Prisma基本信息...')
      
      // 步骤1：修复基本信息
      const fixResponse = await fetch('/api/user/fix-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInfo: localStorageData.userInfo
        })
      })
      
      const fixData = await fixResponse.json()
      
      if (!fixData.success) {
        setSyncResult(`❌ 修复失败: ${fixData.error}`)
        return
      }

      setSyncResult('✅ 步骤1完成！正在重新生成完整元数据（步骤2/2）...')
      
      // 步骤2：重新生成完整元数据
      await regenerateMetadataOnly()
    } catch (error) {
      setSyncResult(`❌ 修复失败: ${error}`)
    }
  }

  const regenerateMetadataOnly = async () => {
    try {
      setSyncResult('🔄 正在重新生成完整元数据（预计15秒）...')
      
      const regenResponse = await fetch('/api/user/regenerate-metadata', {
        method: 'POST'
      })
      
      const regenData = await regenResponse.json()
      
      if (regenData.success) {
        setSyncResult('🎉 完成！元数据已重新生成！正在刷新页面...')
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setSyncResult(`❌ 元数据生成失败: ${regenData.error || JSON.stringify(regenData)}`)
      }
    } catch (error) {
      setSyncResult(`❌ 元数据生成失败: ${error}`)
    }
  }

  const clearLocalStorage = () => {
    if (confirm('确定清除localStorage？')) {
      localStorage.clear()
      setSyncResult('✅ localStorage已清除！请重新登录。')
      setTimeout(() => {
        window.location.href = '/auth/signin'
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 用户数据诊断</h1>

        {/* Session信息 */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">🔐 Session信息</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* 数据不一致警告 */}
        {localStorageData?.userInfo?.gender && prismaData?.userInfo && !prismaData.userInfo.gender && (
          <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2 text-yellow-800">⚠️ 数据不一致！</h2>
            <p className="text-yellow-700 mb-4">
              localStorage有完整数据，但Prisma数据库是空的！
            </p>
            <p className="text-yellow-700 mb-4">
              这会导致场景生成使用旧数据。请立即点击下面的"🔧 修复"按钮！
            </p>
            <button
              onClick={fixPrismaData}
              className="bg-yellow-600 text-white py-2 px-6 rounded-lg hover:bg-yellow-700 font-bold"
            >
              🔧 立即修复数据
            </button>
          </div>
        )}

        {/* Prisma数据 */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">🗄️ Prisma数据库</h2>
          {prismaData ? (
            <>
              <div className="mb-4">
                <h3 className={`font-medium ${prismaData.userInfo?.gender ? 'text-green-600' : 'text-red-600'}`}>
                  {prismaData.userInfo?.gender ? '✅ 数据完整' : '❌ 数据不完整（需要修复）'}
                </h3>
              </div>
              <div className="mb-4">
                <h4 className="font-medium mb-2">基本信息：</h4>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(prismaData.userInfo, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">元数据：</h4>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm max-h-96 overflow-y-auto">
                  {JSON.stringify(prismaData.userMetadata, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <p className="text-red-600">❌ 未获取到数据</p>
          )}
        </div>

        {/* localStorage数据 */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow">
          <h2 className="text-xl font-semibold mb-4">💾 localStorage</h2>
          {localStorageData ? (
            <>
              <div className="mb-4">
                <p><strong>当前用户:</strong> {localStorageData.currentUser}</p>
              </div>
              <div className="mb-4">
                <h4 className="font-medium mb-2">用户信息：</h4>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(localStorageData.userInfo, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">元数据：</h4>
                <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm max-h-96 overflow-y-auto">
                  {JSON.stringify(localStorageData.metadata, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <p className="text-red-600">❌ 无localStorage数据</p>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="bg-white rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">🔧 操作</h2>
          <div className="space-y-4">
            <div className="bg-purple-50 border-2 border-purple-500 rounded-lg p-4 mb-4">
              <h3 className="font-bold text-purple-900 mb-2">🔧 重新生成元数据</h3>
              <p className="text-sm text-purple-700 mb-3">
                基于Prisma中的基本信息，重新生成完整的用户元数据（填充所有空字段）
              </p>
              <button
                onClick={regenerateMetadataOnly}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 font-bold"
              >
                🔄 重新生成元数据（15秒）
              </button>
            </div>
            
            <button
              onClick={syncData}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700"
            >
              🔄 从Prisma同步数据到localStorage
            </button>
            
            <button
              onClick={clearLocalStorage}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700"
            >
              🧹 清除localStorage并重新登录
            </button>
            
            <button
              onClick={checkData}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700"
            >
              🔍 重新检查数据
            </button>
          </div>
          
          {syncResult && (
            <div className={`mt-4 p-4 rounded ${syncResult.includes('成功') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {syncResult}
            </div>
          )}
        </div>

        {/* 返回按钮 */}
        <div className="mt-6">
          <button
            onClick={() => window.location.href = '/home'}
            className="text-blue-600 hover:text-blue-700"
          >
            ← 返回首页
          </button>
        </div>
      </div>
    </div>
  )
}
