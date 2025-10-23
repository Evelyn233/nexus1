'use client'

import { useState, useEffect } from 'react'

export default function DebugDataPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/user/two-layer-data')
      .then(res => res.json())
      .then(result => {
        setData(result)
        setLoading(false)
        console.log('📊 完整数据:', result)
      })
      .catch(err => {
        console.error('加载失败:', err)
        setLoading(false)
      })
  }, [])
  
  if (loading) return <div className="p-8">加载中...</div>
  if (!data) return <div className="p-8">加载失败</div>
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">数据调试页面</h1>
        
        {/* 用户信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">用户信息</h2>
          <p>用户ID: {data.userId}</p>
          <p>用户名: {data.userName}</p>
        </div>
        
        {/* 摘要 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">数据摘要</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(data.summary, null, 2)}
          </pre>
        </div>
        
        {/* 第一层数据 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-purple-600">
            第一层：表意识（用户真实说的、做的）
          </h2>
          <p className="text-sm text-gray-600 mb-4">{data.consciousLayer.description}</p>
          
          {Object.entries(data.consciousLayer.categories).map(([name, category]: [string, any]) => (
            <div key={name} className="mb-6 border-l-4 border-purple-400 pl-4">
              <h3 className="font-bold text-lg mb-2">{name}</h3>
              <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              <div className="bg-purple-50 p-4 rounded">
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(category.data, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
        
        {/* 第二层数据 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-pink-600">
            第二层：潜意识（AI分析的深层模式）
          </h2>
          <p className="text-sm text-gray-600 mb-4">{data.subconsciousLayer.description}</p>
          
          {Object.entries(data.subconsciousLayer.categories).map(([name, category]: [string, any]) => (
            <div key={name} className="mb-6 border-l-4 border-pink-400 pl-4">
              <h3 className="font-bold text-lg mb-2">{name}</h3>
              <p className="text-sm text-gray-600 mb-3">{category.description}</p>
              {category.note && (
                <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded mb-3">
                  {category.note}
                </p>
              )}
              <div className="bg-pink-50 p-4 rounded">
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(category.data, null, 2)}
                </pre>
              </div>
            </div>
          ))}
          
          {/* 分析信息 */}
          <div className="mt-6 bg-gray-100 p-4 rounded">
            <h4 className="font-bold mb-2">分析信息</h4>
            <pre className="text-xs">
              {JSON.stringify(data.subconsciousLayer.analysisInfo, null, 2)}
            </pre>
          </div>
        </div>
        
        {/* 原始JSON */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">完整JSON数据</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}








