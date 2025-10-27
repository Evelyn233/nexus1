'use client'

import { useState } from 'react'

export default function DebugScenePage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testSceneGeneration = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 测试场景生成...')
      
      const response = await fetch('/api/generate/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initialPrompt: '我今天上班很伤心',
          answers: ['感觉被老板忽视了', '工作压力很大']
        })
      })

      console.log('📡 场景生成响应状态:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API错误:', response.status, errorText)
        setError(`API错误 ${response.status}: ${errorText}`)
        return
      }
      
      const data = await response.json()
      console.log('📄 场景生成响应数据:', data)
      
      setResult({
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      })
      
    } catch (err) {
      console.error('❌ 场景生成测试失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const testDirectImageGeneration = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log('🧪 直接测试生图API...')
      
      const response = await fetch('/api/seedream-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'A person sitting alone in an office, looking sad, cinematic lighting, photorealistic',
          negativePrompt: "low quality, blurry, distorted",
          width: 1024,
          height: 1024
        })
      })

      console.log('📡 生图API响应状态:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ 生图API错误:', response.status, errorText)
        setError(`生图API错误 ${response.status}: ${errorText}`)
        return
      }
      
      const data = await response.json()
      console.log('📄 生图API响应数据:', data)
      
      setResult({
        type: 'image',
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      })
      
    } catch (err) {
      console.error('❌ 生图API测试失败:', err)
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }

  const testImagePrompt = () => {
    const testScenes = [
      {
        title: "测试场景1",
        description: "一个人在办公室里独自坐着",
        imagePrompt: "A person sitting alone in an office, looking sad, cinematic lighting, photorealistic"
      },
      {
        title: "测试场景2", 
        description: "地铁里的人们都在看手机",
        imagePrompt: ""
      }
    ]
    
    setResult({
      type: 'imagePrompt',
      data: testScenes,
      timestamp: new Date().toISOString()
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">场景生成调试页面</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">场景生成测试</h2>
            <button
              onClick={testSceneGeneration}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '测试场景生成'}
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">直接生图测试</h2>
            <button
              onClick={testDirectImageGeneration}
              disabled={loading}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? '测试中...' : '直接测试生图'}
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">图片提示词检查</h2>
            <button
              onClick={testImagePrompt}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              检查图片提示词
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
            <div className="bg-gray-100 rounded p-4 overflow-auto max-h-96">
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
