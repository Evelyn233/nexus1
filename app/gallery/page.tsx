'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Trash2, Eye } from 'lucide-react'

interface SavedImage {
  id: string
  imageUrl: string
  prompt: string
  story: string
  sceneTitle: string
  contentId: string
  savedAt: string
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
      // 从数据库加载所有用户生成的内容
      console.log('🖼️ [GALLERY] 开始加载图片...')
      const response = await fetch('/api/user/generated-content?limit=1000&offset=0')
      
      if (!response.ok) {
        console.error('🖼️ [GALLERY] API请求失败:', response.status, response.statusText)
        setLoading(false)
        return
      }
      
      const data = await response.json()
      console.log('🖼️ [GALLERY] API返回:', {
        success: data.success,
        contentsLength: data.contents?.length || 0,
        total: data.total || 0
      })
      
      if (!data.success) {
        console.error('🖼️ [GALLERY] API返回失败:', data.error)
        setLoading(false)
        return
      }
      
      if (!data.contents || data.contents.length === 0) {
        console.log('🖼️ [GALLERY] 没有生成内容记录')
        setSavedImages([])
        setLoading(false)
        return
      }
      
      // 提取所有内容中的图片
      const allImages: SavedImage[] = []
      data.contents.forEach((content: any, contentIndex: number) => {
        console.log(`🖼️ [GALLERY] 处理内容 ${contentIndex + 1}/${data.contents.length}:`, {
          id: content.id,
          hasImages: !!content.images,
          imagesType: typeof content.images,
          imageCount: content.imageCount
        })
        
        if (content.images) {
          try {
            const images = typeof content.images === 'string' 
              ? JSON.parse(content.images) 
              : content.images
            
            console.log(`🖼️ [GALLERY] 解析图片成功，数量: ${images.length}`)
            
            if (Array.isArray(images) && images.length > 0) {
              images.forEach((img: any, imgIndex: number) => {
                if (img.imageUrl) {
                  allImages.push({
                    id: `${content.id}-${img.sceneIndex || imgIndex}`,
                    imageUrl: img.imageUrl,
                    prompt: img.prompt || img.story || content.initialPrompt || '',
                    story: img.story || '',
                    sceneTitle: img.sceneTitle || `场景 ${(img.sceneIndex ?? imgIndex) + 1}`,
                    contentId: content.id,
                    savedAt: content.createdAt
                  })
                } else {
                  console.warn(`🖼️ [GALLERY] 图片 ${imgIndex} 缺少 imageUrl`)
                }
              })
            } else {
              console.warn(`🖼️ [GALLERY] images 不是有效数组或为空`)
            }
          } catch (error) {
            console.error('🖼️ [GALLERY] 解析图片失败:', error, content.images)
          }
        } else {
          console.log(`🖼️ [GALLERY] 内容 ${content.id} 没有图片数据`)
        }
      })
      
      console.log('🖼️ [GALLERY] 提取的图片数量:', allImages.length)
      console.log('🖼️ [GALLERY] 图片列表预览:', allImages.slice(0, 3).map(img => ({
        id: img.id,
        sceneTitle: img.sceneTitle,
        hasUrl: !!img.imageUrl
      })))
      
      setSavedImages(allImages)
    } catch (error) {
      console.error('❌ [GALLERY] 加载图片失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm('确定要删除这张图片吗？')) return
    
    // 从数据库删除整个内容（暂不支持单独删除单张图片）
    alert('删除功能即将上线！您可以在历史记录中删除整个创作内容。')
  }

  const handleDownload = (image: SavedImage) => {
    // 下载图片
    const link = document.createElement('a')
    link.href = image.imageUrl
    link.download = `${image.sceneTitle}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleViewContent = (contentId: string) => {
    router.push(`/history/${contentId}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 🔒 用户画像数据不对外暴露，仅用于后台分析和优化生成内容

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/inflow-logo.jpeg" 
              alt="logo" 
              className="w-20 h-14 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/home')}
            />
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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magazine-primary"></div>
          </div>
        ) : savedImages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🖼️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无图片</h3>
            <p className="text-gray-500 mb-4">
              {loading ? '正在加载图片...' : '开始创作后，你的所有图片都会显示在这里'}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/home')}
                className="bg-magazine-primary text-white px-6 py-2 rounded-lg hover:bg-magazine-secondary transition-colors"
              >
                开始创作
              </button>
              <p className="text-xs text-gray-400">
                💡 提示：在主页输入你的想法，生成专属图片
              </p>
            </div>
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
                <div key={image.id} className="bg-white rounded-lg shadow-sm overflow-hidden group">
                  <div className="aspect-square relative">
                    <img
                      src={image.imageUrl}
                      alt={image.sceneTitle}
                      className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setSelectedImage(image)}
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {image.sceneTitle}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-900 line-clamp-2 mb-2">
                      {image.prompt.length > 50 ? image.prompt.substring(0, 50) + '...' : image.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>{formatDate(image.savedAt)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewContent(image.contentId)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-purple-50 text-purple-600 rounded text-xs hover:bg-purple-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>详情</span>
                      </button>
                      <button
                        onClick={() => handleDownload(image)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1 px-2 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>下载</span>
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
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{selectedImage.sceneTitle}</h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              <div className="aspect-square relative mb-4 rounded-lg overflow-hidden">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.sceneTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">场景描述</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedImage.prompt}</p>
                </div>
                
                {selectedImage.story && selectedImage.story !== selectedImage.prompt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">故事内容</label>
                    <p className="text-sm text-gray-700 mt-1">{selectedImage.story}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">创作时间</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedImage.savedAt)}</p>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleViewContent(selectedImage.contentId)}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>查看完整创作</span>
                </button>
                <button
                  onClick={() => handleDownload(selectedImage)}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>下载</span>
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
