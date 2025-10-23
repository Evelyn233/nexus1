'use client'

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-purple-600 mb-4">Lumina</h1>
        <p className="text-gray-600 mb-8">测试页面 - 如果看到这个，说明应用正常运行</p>
        <a 
          href="/" 
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  )
}


