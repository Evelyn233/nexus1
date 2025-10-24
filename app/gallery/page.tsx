'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Trash2, Eye } from 'lucide-react'
import Image from 'next/image'
import { getUserInfoDescription, getUserMetadata } from '@/lib/userInfoService'

interface SavedImage {
  filename: string
  prompt: string
  originalUrl: string
  savedAt: string
  size: number
  localPath: string
}

export default function GalleryPage() {
  const router = useRouter()
  const [savedImages, setSavedImages] = useState<SavedImage[]>([])
  const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadSavedImages()
  }, [])

  const loadSavedImages = async () => {
    try {
      // 从本地存储加载图片信息
      const response = await fetch('/api/saved-images')
      if (response.ok) {
        const data = await response.json()
        setSavedImages(data.images || [])
      }
    } catch (error) {
      console.error('加载图片失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm('确定要删除这张图片吗？')) return
    
    try {
      const response = await fetch('/api/delete-image', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      })
      
      if (response.ok) {
        setSavedImages(prev => prev.filter(img => img.filename !== filename))
        if (selectedImage?.filename === filename) {
          setSelectedImage(null)
        }
      }
    } catch (error) {
      console.error('删除图片失败:', error)
    }
  }

  const handleDownload = (image: SavedImage) => {
    const link = document.createElement('a')
    link.href = image.localPath
    link.download = image.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 用户信息组件
  const UserProfileInfo = () => {
    if (!mounted) {
      return null
    }
    
    const userInfoDescription = getUserInfoDescription()
    const userMetadata = getUserMetadata()
    
    // 检查是否有用户信息
    const hasUserInfo = userInfoDescription && userInfoDescription.trim() !== ''
    const hasMetadata = userMetadata && (
      userMetadata.corePersonalityTraits?.length > 0 ||
      userMetadata.communicationStyle?.length > 0 ||
      userMetadata.emotionalPattern?.length > 0
    )
    
    if (!hasUserInfo && !hasMetadata) {
      return null
    }
    
    return (
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 您的画像分析</h3>
        <div className="text-sm text-blue-700 space-y-2">
          {/* 深度分析 - 隐藏，只作为后台数据存储 */}
          {/* {hasUserInfo && (
            <div className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>{userInfoDescription}</span>
            </div>
          )} */}
          
          {hasMetadata && (
            <div className="mt-3 space-y-1">
              {userMetadata.corePersonalityTraits?.length > 0 && (
                <div>
                  <span className="font-medium text-blue-800">核心特质：</span>
                  <span>{userMetadata.corePersonalityTraits.slice(0, 3).join('、')}</span>
                  {userMetadata.corePersonalityTraits.length > 3 && <span>等</span>}
                </div>
              )}
              
              {userMetadata.communicationStyle?.length > 0 && userMetadata.communicationStyle[0] !== '待分析' && (
                <div>
                  <span className="font-medium text-blue-800">沟通风格：</span>
                  <span>{userMetadata.communicationStyle.slice(0, 2).join('、')}</span>
                </div>
              )}
              
              {userMetadata.emotionalPattern?.length > 0 && userMetadata.emotionalPattern[0] !== '待分析' && (
                <div>
                  <span className="font-medium text-blue-800">情感模式：</span>
                  <span>{userMetadata.emotionalPattern.slice(0, 2).join('、')}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-blue-600">
          您的个性化图片画廊，展现您的独特风格
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="font-handwriting text-xl text-magazine-purple">
              logo
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">返回</span>
            </button>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">图片画廊</h1>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto p-4">
        {/* User Profile Info - 用户信息显示 */}
        <UserProfileInfo />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : savedImages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🖼️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无保存的图片</h3>
            <p className="text-gray-500 mb-4">生成一些图片后，它们会显示在这里</p>
            <button
              onClick={() => router.push('/')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              开始生成
            </button>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">已保存图片</span>
                <span className="text-lg font-semibold text-gray-900">{savedImages.length} 张</span>
              </div>
            </div>

            {/* Image Grid */}
            <div className="grid grid-cols-2 gap-4">
              {savedImages.map((image, index) => (
                <div key={image.filename} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="aspect-square relative">
                    <Image
                      src={image.localPath}
                      alt={image.prompt}
                      fill
                      className="object-cover cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                      quality={100}
                      unoptimized={true}
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatDate(image.savedAt)}</span>
                      <span>{formatFileSize(image.size)}</span>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => setSelectedImage(image)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>查看</span>
                      </button>
                      <button
                        onClick={() => handleDownload(image)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载</span>
                      </button>
                      <button
                        onClick={() => handleDelete(image.filename)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>删除</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">图片详情</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              <div className="aspect-square relative mb-4">
                <Image
                  src={selectedImage.localPath}
                  alt={selectedImage.prompt}
                  fill
                  className="object-cover rounded-lg"
                  quality={100}
                  unoptimized={true}
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">提示词</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedImage.prompt}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">文件名</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedImage.filename}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">文件大小</label>
                    <p className="text-sm text-gray-900 mt-1">{formatFileSize(selectedImage.size)}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">保存时间</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedImage.savedAt)}</p>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>下载</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedImage.filename)}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 输入框 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <input
            type="text"
            placeholder="输入您的需求..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => router.push('/chat-new')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
