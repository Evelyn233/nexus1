'use client'

import { useState, useEffect } from 'react'
import { getUserMetadata, getUserInfo } from '@/lib/userInfoService'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MetadataViewer() {
  const router = useRouter()
  const [metadata, setMetadata] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const meta = getUserMetadata()
    const info = getUserInfo()
    setMetadata(meta)
    setUserInfo(info)
  }

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSections(newExpanded)
  }

  const renderValue = (value: any): string => {
    if (Array.isArray(value)) {
      return `[${value.length}项] ${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}`
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...'
    }
    return String(value)
  }

  const getFieldLength = (value: any): number => {
    if (Array.isArray(value)) return value.length
    if (typeof value === 'string') return value.length
    return 0
  }

  if (!metadata) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="text-center">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              用户元数据查看器
            </h1>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            🔄 刷新
          </button>
        </div>

        {/* 用户基本信息 */}
        {userInfo && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">基本信息</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">姓名</span>
                <p className="font-medium">{userInfo.name}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">性别</span>
                <p className="font-medium">{userInfo.gender === 'female' ? '女' : '男'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">年龄</span>
                <p className="font-medium">{userInfo.age}岁</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">地点</span>
                <p className="font-medium">{userInfo.location}</p>
              </div>
            </div>
          </div>
        )}

        {/* 元数据字段 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            元数据字段 
            <span className="text-sm text-gray-500 ml-2">
              (共 {Object.keys(metadata).length} 个字段)
            </span>
          </h2>
          
          <div className="space-y-2">
            {Object.entries(metadata).map(([key, value]) => {
              const isExpanded = expandedSections.has(key)
              const length = getFieldLength(value)
              
              return (
                <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                      <div>
                        <span className="font-medium text-gray-800">{key}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({length} {Array.isArray(value) ? '项' : '字符'})
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                      {typeof value === 'string' ? 'String' : Array.isArray(value) ? 'Array' : 'Object'}
                    </span>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 py-3 bg-white">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {typeof value === 'string' 
                          ? value 
                          : JSON.stringify(value, null, 2)
                        }
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 更新日志提示 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>提示：</strong>元数据会在每次对话完成后自动更新。你可以在这里实时查看最新的用户档案数据。
          </p>
        </div>
      </div>
    </div>
  )
}










