'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface TwoLayerData {
  userId: string
  userName: string
  consciousLayer: {
    description: string
    data: any
  }
  subconsciousLayer: {
    description: string
    data: any
    analysisInfo: any
  }
  summary: {
    totalConversations: number
    totalRawInputs: number
    totalKeywords: number
    totalAnalyzedTraits: number
  }
}

export default function TwoLayerDataPage() {
  const router = useRouter()
  const [data, setData] = useState<TwoLayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'conscious' | 'subconscious'>('conscious')
  
  useEffect(() => {
    fetchTwoLayerData()
  }, [])
  
  const fetchTwoLayerData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/two-layer-data')
      
      if (!response.ok) {
        throw new Error('获取数据失败')
      }
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('获取两层数据失败:', error)
      alert('获取数据失败，请重试')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }
  
  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">无法加载数据</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            两层数据架构
          </h1>
          <p className="text-gray-600 mb-6">
            查看你的表意识（真实说的、做的）和潜意识（AI分析的深层模式）
          </p>
          
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{data.summary.totalConversations || 0}</div>
              <div className="text-sm text-gray-600">对话记录</div>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-pink-600">{data.summary.totalRawInputs || 0}</div>
              <div className="text-sm text-gray-600">原始输入</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{data.summary.totalKeywords || 0}</div>
              <div className="text-sm text-gray-600">提取关键词</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{data.summary.totalAnalyzedTraits || 0}</div>
              <div className="text-sm text-gray-600">分析特质</div>
            </div>
          </div>
          
          {/* Priority Rule */}
          {(data.summary as any).priorityRule && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-600 p-4">
              <p className="text-blue-800 font-semibold">📌 {(data.summary as any).priorityRule}</p>
              {(data.summary as any).note && (
                <p className="text-blue-600 text-sm mt-1">{(data.summary as any).note}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('conscious')}
              className={`flex-1 px-8 py-4 text-lg font-semibold transition-colors ${
                activeTab === 'conscious'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🧠 第一层：表意识
            </button>
            <button
              onClick={() => setActiveTab('subconscious')}
              className={`flex-1 px-8 py-4 text-lg font-semibold transition-colors ${
                activeTab === 'subconscious'
                  ? 'bg-pink-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔮 第二层：潜意识
            </button>
          </div>
          
          <div className="p-8">
            {activeTab === 'conscious' ? (
              <div className="space-y-8">
                <div>
                  <p className="text-gray-600 italic mb-6">{(data.consciousLayer as any).description}</p>
                </div>
                
                {/* 遍历所有分类 */}
                {Object.entries((data.consciousLayer as any).categories || {}).map(([categoryName, category]: [string, any]) => (
                  <div key={categoryName}>
                    <h3 className="text-2xl font-bold mb-4 text-purple-600">{categoryName}</h3>
                    <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                    
                    {categoryName === '1. 用户自我填写' && (
                      <div className="bg-purple-50 rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="font-semibold">姓名：</span>
                            <p className="text-gray-700 mt-1">{category.data.name || '未填写'}</p>
                          </div>
                          <div>
                            <span className="font-semibold">性别：</span>
                            <p className="text-gray-700 mt-1">{category.data.gender === 'female' ? '女性' : category.data.gender === 'male' ? '男性' : '未填写'}</p>
                          </div>
                          <div>
                            <span className="font-semibold">所在地：</span>
                            <p className="text-gray-700 mt-1">{category.data.location || '未填写'}</p>
                          </div>
                          <div>
                            <span className="font-semibold">MBTI：</span>
                            <p className="text-gray-700 mt-1">{category.data.selfMBTI || '未填写'}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <span className="font-semibold">性格描述：</span>
                          <p className="text-gray-700 mt-1">{category.data.personality || '未填写'}</p>
                        </div>
                        {category.data.selfTraits?.length > 0 && (
                          <div className="mt-4">
                            <span className="font-semibold">自我特质：</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {category.data.selfTraits.map((trait: string, idx: number) => (
                                <span key={idx} className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm">
                                  {trait}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {categoryName === '2. 对话记录' && Array.isArray(category.data) && (
                      <div className="space-y-4">
                        {category.data.slice(0, 5).map((conv: any) => (
                          <div key={conv.id} className="bg-purple-50 rounded-lg p-4">
                            <div className="text-sm text-gray-500 mb-2">
                              {new Date(conv.date).toLocaleString('zh-CN')}
                            </div>
                            <div className="font-semibold mb-2">💬 {conv.initialPrompt}</div>
                            <div className="text-sm text-gray-600">
                              {conv.answers.slice(0, 2).map((answer: string, i: number) => (
                                <div key={i} className="mt-1">• {answer}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {categoryName === '3. 原始输入' && Array.isArray(category.data) && category.data.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-6">
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {category.data.slice(0, 10).map((input: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-700">
                              {typeof input === 'string' ? input : input.input || JSON.stringify(input)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {categoryName === '4. 提到的关键词' && Array.isArray(category.data) && category.data.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {category.data.map((keyword: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <p className="text-gray-600 italic mb-6">{(data.subconsciousLayer as any).description}</p>
                </div>
                
                {/* 遍历所有分类 */}
                {Object.entries((data.subconsciousLayer as any).categories || {}).map(([categoryName, category]: [string, any]) => (
                  <div key={categoryName}>
                    <h3 className="text-2xl font-bold mb-4 text-pink-600">{categoryName}</h3>
                    <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                    {category.note && (
                      <p className="text-sm text-orange-600 mb-3 bg-orange-50 p-2 rounded">{category.note}</p>
                    )}
                    
                    <div className="bg-pink-50 rounded-lg p-6">
                      {Object.entries(category.data).map(([fieldName, fieldValue]: [string, any]) => {
                        if (!fieldValue) return null
                        
                        // 如果是数组
                        if (Array.isArray(fieldValue) && fieldValue.length > 0) {
                          return (
                            <div key={fieldName} className="mb-4 last:mb-0">
                              <h4 className="font-semibold text-pink-700 mb-2 capitalize">
                                {fieldName.replace(/([A-Z])/g, ' $1').trim()}:
                              </h4>
                              <ul className="space-y-2">
                                {fieldValue.map((item: any, idx: number) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-pink-600 mr-2">▸</span>
                                    <span className="text-gray-700">
                                      {typeof item === 'string' ? item : JSON.stringify(item)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        }
                        
                        // 如果是字符串
                        if (typeof fieldValue === 'string') {
                          return (
                            <div key={fieldName} className="mb-4 last:mb-0">
                              <h4 className="font-semibold text-pink-700 mb-2 capitalize">
                                {fieldName.replace(/([A-Z])/g, ' $1').trim()}:
                              </h4>
                              <p className="text-gray-700">{fieldValue}</p>
                            </div>
                          )
                        }
                        
                        return null
                      })}
                      
                      {Object.values(category.data).every((v: any) => !v || (Array.isArray(v) && v.length === 0)) && (
                        <p className="text-gray-500 italic">暂无数据</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 分析信息 */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold mb-2">分析元信息</h4>
                  <div className="text-sm text-gray-600">
                    <p>最后分析时间：{(data.subconsciousLayer as any).analysisInfo?.lastAnalyzed 
                      ? new Date((data.subconsciousLayer as any).analysisInfo.lastAnalyzed).toLocaleString('zh-CN')
                      : '未分析'
                    }</p>
                    <p>更新次数：{(data.subconsciousLayer as any).analysisInfo?.updateCount || 0}</p>
                    {(data.subconsciousLayer as any).analysisInfo?.note && (
                      <p className="mt-2 text-blue-600">{(data.subconsciousLayer as any).analysisInfo.note}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-shadow"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  )
}

