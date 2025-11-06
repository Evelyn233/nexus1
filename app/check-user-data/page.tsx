'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export default function CheckUserDataPage() {
  const { data: session } = useSession()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      checkUserData()
    }
  }, [session])

  const checkUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/user/info')
      if (!response.ok) {
        throw new Error(`API错误: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 [CHECK] 用户数据:', data)
      setUserData(data)
    } catch (err: any) {
      console.error('❌ [CHECK] 检查失败:', err)
      setError(err.message || '检查失败')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (birthDate: any) => {
    if (!birthDate || !birthDate.year) return '未知'
    const currentYear = new Date().getFullYear()
    return currentYear - parseInt(birthDate.year)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">检查中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">用户数据检查</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">❌ 错误：</p>
            <p>{error}</p>
            <p className="text-sm mt-2">
              可能原因：数据库连接失败。请检查：
              <br />1. DATABASE_URL 环境变量是否正确
              <br />2. Neon 数据库是否正常运行
              <br />3. 网络连接是否正常
            </p>
          </div>
        )}

        {userData && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">当前用户数据</h2>
              <button
                onClick={checkUserData}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                🔄 刷新
              </button>
            </div>

            {/* 基本信息 */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-700">基本信息</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">姓名：</span>
                  <span className="font-medium">{userData.userInfo?.name || '未设置'}</span>
                </div>
                <div>
                  <span className="text-gray-600">邮箱：</span>
                  <span className="font-medium">{session?.user?.email}</span>
                </div>
                <div>
                  <span className="text-gray-600">性别：</span>
                  <span className={`font-medium ${userData.userInfo?.gender === 'female' ? 'text-pink-600' : userData.userInfo?.gender === 'male' ? 'text-blue-600' : 'text-gray-400'}`}>
                    {userData.userInfo?.gender === 'female' ? '女性' : userData.userInfo?.gender === 'male' ? '男性' : '未设置'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">年龄：</span>
                  <span className={`font-medium ${userData.userInfo?.age === 35 ? 'text-red-600' : 'text-gray-900'}`}>
                    {userData.userInfo?.age || '未设置'}岁
                    {userData.userInfo?.age === 35 && ' ⚠️ 可能是默认值'}
                  </span>
                  {userData.userInfo?.birthDate && (
                    <span className="text-xs text-gray-500 ml-2">
                      (出生年份: {userData.userInfo.birthDate.year || '未知'})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">身高：</span>
                  <span className={`font-medium ${userData.userInfo?.height === '170' || userData.userInfo?.height === '' ? 'text-red-600' : 'text-gray-900'}`}>
                    {userData.userInfo?.height || '未设置'}cm
                    {(userData.userInfo?.height === '170' || userData.userInfo?.height === '') && ' ⚠️ 可能是默认值'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">体重：</span>
                  <span className={`font-medium ${userData.userInfo?.weight === '60' || userData.userInfo?.weight === '' ? 'text-red-600' : 'text-gray-900'}`}>
                    {userData.userInfo?.weight || '未设置'}kg
                    {(userData.userInfo?.weight === '60' || userData.userInfo?.weight === '') && ' ⚠️ 可能是默认值'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">地点：</span>
                  <span className={`font-medium ${userData.userInfo?.location === '未知' || userData.userInfo?.location === '' ? 'text-red-600' : 'text-gray-900'}`}>
                    {userData.userInfo?.location || '未设置'}
                    {(userData.userInfo?.location === '未知' || userData.userInfo?.location === '') && ' ⚠️ 可能是默认值'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">头发：</span>
                  <span className="font-medium">{userData.userInfo?.hairLength || '未设置'}</span>
                </div>
              </div>
            </div>

            {/* 出生日期详细信息 */}
            {userData.userInfo?.birthDate && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-700">出生日期</h3>
                <div className="bg-gray-50 p-4 rounded text-sm">
                  <pre>{JSON.stringify(userData.userInfo.birthDate, null, 2)}</pre>
                  <p className="mt-2 text-gray-600">
                    计算年龄: {calculateAge(userData.userInfo.birthDate)}岁
                    {userData.userInfo.birthDate.year === '1990' && (
                      <span className="text-red-600 ml-2">⚠️ 这是默认值！</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* 诊断信息 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <h3 className="font-semibold mb-2 text-yellow-800">🔍 诊断信息</h3>
              <ul className="text-sm space-y-1 text-yellow-700">
                {userData.userInfo?.age === 35 && (
                  <li>⚠️ 年龄是35岁，可能是默认值（1990年出生）</li>
                )}
                {(userData.userInfo?.location === '未知' || userData.userInfo?.location === '') && (
                  <li>⚠️ 地点是"未知"，可能是默认值</li>
                )}
                {(userData.userInfo?.height === '170' || userData.userInfo?.height === '') && (
                  <li>⚠️ 身高是170cm或未设置，可能是默认值</li>
                )}
                {userData.userInfo?.gender === 'unknown' && (
                  <li>⚠️ 性别是"unknown"，需要设置</li>
                )}
                {!userData.userInfo?.birthDate?.year && (
                  <li>⚠️ 没有出生年份，无法计算年龄</li>
                )}
                {userData.userInfo?.birthDate?.year === '1990' && (
                  <li>⚠️ 出生年份是1990年（默认值），需要更新</li>
                )}
              </ul>
              <div className="mt-4">
                <p className="text-sm font-semibold text-yellow-800">建议：</p>
                <p className="text-sm text-yellow-700">
                  如果这些数据不正确，请前往 <a href="/user-info" className="underline font-semibold">用户信息页面</a> 更新您的个人信息。
                </p>
              </div>
            </div>

            {/* 原始数据 */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700">查看原始JSON数据</summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(userData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
}


