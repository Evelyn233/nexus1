'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface UserMetadata {
  coreTraits?: string[]
  communicationStyle?: string[]
  emotionalPattern?: string[]
  frequentLocations?: string[]
  aestheticPreferences?: string[]
  [key: string]: any
}

interface User {
  id: string
  email: string | null
  phone: string | null
  name: string | null
  gender: string | null
  age: number | null
  height: string | null
  weight: string | null
  location: string | null
  personality: string | null
  hairLength: string | null
  createdAt: Date
  updatedAt: Date
  metadata: UserMetadata | null
  chatSessionsCount: number
  generatedContentsCount: number
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    if (status === 'authenticated') {
      loadUsers()
    }
  }, [status, router])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 [ADMIN-PAGE] 开始获取用户数据...')
      const response = await fetch('/api/admin/view-users')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '未知错误' }))
        throw new Error(`获取用户数据失败: ${response.status} - ${errorData.error || errorData.details || '未知错误'}`)
      }
      
      const data = await response.json()
      console.log('📊 [ADMIN-PAGE] API返回数据:', {
        success: data.success,
        totalUsers: data.totalUsers,
        usersCount: data.users?.length,
        users: data.users?.map((u: User) => ({ id: u.id, email: u.email, name: u.name }))
      })
      
      if (data.success) {
        setUsers(data.users || [])
        if (data.totalUsers === 0) {
          setError('数据库中没有用户数据')
        } else if (data.users?.length === 0) {
          setError('获取到用户数据但列表为空')
        }
      } else {
        throw new Error(data.error || '获取用户数据失败')
      }
    } catch (err: any) {
      console.error('❌ [ADMIN-PAGE] 加载用户数据失败:', err)
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
      setSelectedUser(null)
    } else {
      newExpanded.add(userId)
      setSelectedUser(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const renderMetadataField = (key: string, value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">未设置</span>
    }
    
    if (Array.isArray(value)) {
      return (
        <div>
          <span className="text-purple-600 font-medium">[{value.length}项]</span>
          <ul className="ml-4 mt-1 space-y-1">
            {value.slice(0, 10).map((item, i) => (
              <li key={i} className="text-sm text-gray-700">• {String(item)}</li>
            ))}
            {value.length > 10 && (
              <li className="text-sm text-gray-500">...还有 {value.length - 10} 项</li>
            )}
          </ul>
        </div>
      )
    }
    
    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }
    
    if (typeof value === 'string' && value.length > 200) {
      return (
        <div>
          <p className="text-sm">{value.substring(0, 200)}...</p>
          <span className="text-xs text-gray-500">({value.length} 字符)</span>
        </div>
      )
    }
    
    return <span className="text-sm">{String(value)}</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">用户数据库查看器</h1>
              <p className="text-gray-600 mt-2">当前登录：{session?.user?.email}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                🔄 刷新
              </button>
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                共 {users.length} 个用户
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">❌ 错误：</p>
            <p>{error}</p>
            <p className="text-sm mt-2">
              可能原因：
              <br />1. 数据库连接失败（请检查DATABASE_URL环境变量）
              <br />2. 数据库中没有用户数据
              <br />3. 查询权限问题
            </p>
          </div>
        )}

        {/* 用户列表 */}
        <div className="space-y-4">
          {users.map((user) => {
            const isExpanded = expandedUsers.has(user.id)
            const hasMetadata = !!user.metadata
            
            return (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* 用户基本信息行 */}
                <button
                  onClick={() => toggleUser(user.id)}
                  className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.name || '未设置姓名'}
                          </h3>
                          {user.email && (
                            <span className="text-sm text-gray-500">({user.email})</span>
                          )}
                          {user.phone && (
                            <span className="text-sm text-gray-500">({user.phone})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          {user.gender && <span>性别: {user.gender === 'female' ? '女' : '男'}</span>}
                          {user.age && <span>年龄: {user.age}岁</span>}
                          {user.height && <span>身高: {user.height}</span>}
                          {user.location && <span>地点: {user.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {hasMetadata && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          ✅ 有元数据
                        </span>
                      )}
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        对话: {user.chatSessionsCount}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        内容: {user.generatedContentsCount}
                      </span>
                    </div>
                  </div>
                </button>

                {/* 展开的详细信息 */}
                {isExpanded && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 基本信息 */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">基本信息</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-600">ID:</span> <span className="font-mono text-xs">{user.id}</span></div>
                          <div><span className="text-gray-600">姓名:</span> {user.name || '未设置'}</div>
                          <div><span className="text-gray-600">邮箱:</span> {user.email || '未设置'}</div>
                          <div><span className="text-gray-600">手机:</span> {user.phone || '未设置'}</div>
                          <div><span className="text-gray-600">性别:</span> {user.gender || '未设置'}</div>
                          <div><span className="text-gray-600">年龄:</span> {user.age || '未设置'}</div>
                          <div><span className="text-gray-600">身高:</span> {user.height || '未设置'}</div>
                          <div><span className="text-gray-600">体重:</span> {user.weight || '未设置'}</div>
                          <div><span className="text-gray-600">地点:</span> {user.location || '未设置'}</div>
                          <div><span className="text-gray-600">性格:</span> {user.personality || '未设置'}</div>
                          <div><span className="text-gray-600">头发:</span> {user.hairLength || '未设置'}</div>
                          <div><span className="text-gray-600">创建时间:</span> {new Date(user.createdAt).toLocaleString('zh-CN')}</div>
                          <div><span className="text-gray-600">更新时间:</span> {new Date(user.updatedAt).toLocaleString('zh-CN')}</div>
                        </div>
                      </div>

                      {/* 元数据 */}
                      {hasMetadata && user.metadata && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">元数据字段</h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {Object.entries(user.metadata).map(([key, value]) => {
                              if (key === 'id' || key === 'userId') return null
                              return (
                                <div key={key} className="border-b border-gray-200 pb-2">
                                  <div className="font-medium text-sm text-gray-700 mb-1">{key}:</div>
                                  <div className="text-xs">
                                    {renderMetadataField(key, value)}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {!hasMetadata && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">元数据</h4>
                          <p className="text-sm text-gray-500">暂无元数据</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {users.length === 0 && !loading && !error && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">暂无用户数据</p>
            <p className="text-sm text-gray-400 mt-2">数据库连接正常，但没有找到用户记录</p>
          </div>
        )}
      </div>
    </div>
  )
}

