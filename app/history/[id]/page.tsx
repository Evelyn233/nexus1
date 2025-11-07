'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Download, Share2, Calendar, Image as ImageIcon, Play, Trash2 } from 'lucide-react'
import Image from 'next/image'

interface ContentDetail {
  id: string
  initialPrompt: string
  questions: string[]
  answers: string[]
  images: Array<{
    sceneTitle: string
    sceneIndex: number
    prompt: string
    imageUrl: string
    story?: string
  }>
  imageCount: number
  category: string
  tags: string[]
  storyNarrative?: string
  createdAt: string
  updatedAt: string
  status?: string // 内容状态：completed, published
  title?: string // AI生成的标题
}

export default function HistoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contentId = params?.id as string

  const [content, setContent] = useState<ContentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    if (contentId) {
      loadContent()
      loadComments()
    }
  }, [contentId])
  
  const loadComments = async () => {
    try {
      const response = await fetch(`/api/comments?contentId=${contentId}`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error('加载评论失败:', error)
    }
  }
  
  const handleSubmitComment = async () => {
    if (!commentText.trim() || !contentId) return
    
    setIsSubmittingComment(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: contentId,
          text: commentText.trim()
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setComments(prev => [data.comment, ...prev])
        setCommentText('')
      } else {
        const errorData = await response.json()
        alert(errorData.error || '评论失败')
      }
    } catch (error) {
      console.error('提交评论失败:', error)
      alert('评论失败，请稍后重试')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const loadContent = async () => {
    try {
      setLoading(true)
      console.log('🔍 [HISTORY-DETAIL] 加载内容详情:', contentId)

      const response = await fetch(`/api/user/generated-content/${contentId}`)
      
      if (!response.ok) {
        const error = await response.json()
        console.error('❌ [HISTORY-DETAIL] 加载失败:', error)
        setError(error.error || '加载失败')
        return
      }

      const result = await response.json()
      console.log('✅ [HISTORY-DETAIL] 加载成功:', result)
      console.log('🔍 [HISTORY-DETAIL] 完整内容数据:', result.content)
      console.log('🔍 [HISTORY-DETAIL] 图片数据原始值:', result.content?.images)
      console.log('🔍 [HISTORY-DETAIL] 图片数据类型:', typeof result.content?.images)
      console.log('🔍 [HISTORY-DETAIL] 图片数量:', result.content?.images?.length)
      console.log('🔍 [HISTORY-DETAIL] imageCount:', result.content?.imageCount)
      console.log('🔍 [HISTORY-DETAIL] status:', result.content?.status)
      console.log('🔍 [HISTORY-DETAIL] title:', result.content?.title)
      
      if (result.success && result.content) {
        // 🔥 确保images是数组格式
        let images = result.content.images
        if (typeof images === 'string') {
          try {
            images = JSON.parse(images)
            console.log('✅ [HISTORY-DETAIL] 成功解析JSON字符串')
          } catch (e) {
            console.error('❌ [HISTORY-DETAIL] 解析images失败:', e)
            images = []
          }
        }
        if (!Array.isArray(images)) {
          console.warn('⚠️ [HISTORY-DETAIL] images不是数组，转换为数组')
          console.warn('⚠️ [HISTORY-DETAIL] images实际类型:', typeof images, images)
          images = []
        }
        
        console.log('✅ [HISTORY-DETAIL] 最终图片数据:', images)
        console.log('✅ [HISTORY-DETAIL] 最终图片数量:', images.length)
        
        setContent({
          ...result.content,
          images: images
        })
      } else {
        setError(result.error || '内容不存在')
      }
    } catch (error) {
      console.error('❌ [HISTORY-DETAIL] 加载异常:', error)
      setError('加载异常')
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `${title}.jpg`
    link.click()
  }

  // 删除作品
  const handleDelete = async () => {
    if (!content) return
    
    // 确认删除
    const confirmed = window.confirm('确定要删除这个作品吗？删除后无法恢复。')
    if (!confirmed) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/user/generated-content/${contentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        console.log('✅ [HISTORY-DETAIL] 作品删除成功')
        // 跳转到首页或个人主页
        router.push('/home')
      } else {
        const errorData = await response.json()
        console.error('❌ [HISTORY-DETAIL] 删除失败:', errorData)
        alert('删除失败，请稍后重试')
      }
    } catch (error) {
      console.error('❌ [HISTORY-DETAIL] 删除异常:', error)
      alert('删除失败，请稍后重试')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '内容不存在'}</p>
          <button
            onClick={() => router.push('/home')}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      {/* 头部 */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => router.push('/home')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {content.title || '故事详情'}
            </h1>
            {/* 已发布的作品显示删除按钮 */}
            {content.status === 'published' && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="删除作品"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? '删除中...' : '删除'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(content.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span>{content.images?.length || content.imageCount || 0} 张图片</span>
            </div>
            {content.category && content.category !== 'daily' && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                {content.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 聊天流式展示：所有内容整合在一个连续的聊天界面中 */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            
            {/* 🔥 已发布的作品：只显示标题，不显示聊天记录 */}
            {content.status === 'published' && content.title && (
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{content.title}</h2>
              </div>
            )}
            
            {/* 🔥 未发布的作品：显示完整的聊天记录 */}
            {content.status !== 'published' && (
              <>
                {/* 用户初始输入 */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-purple-500 text-white rounded-2xl px-4 py-3">
                    <p className="text-sm leading-relaxed">{content.initialPrompt}</p>
                  </div>
                </div>
                
                {/* 问答对话 */}
                {content.questions && content.questions.map((question, index) => (
                  <div key={index} className="space-y-4">
                    {/* AI问题 */}
                    <div className="flex justify-start">
                      <div className="max-w-[80%] bg-white text-gray-800 rounded-2xl px-4 py-3 shadow-sm border">
                        <p className="text-sm leading-relaxed">{question}</p>
                      </div>
                    </div>
                    
                    {/* 用户回答 */}
                    {content.answers[index] && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-purple-500 text-white rounded-2xl px-4 py-3">
                          <p className="text-sm leading-relaxed">{content.answers[index]}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* AI生成的故事叙述 */}
                {content.storyNarrative && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800 rounded-2xl px-4 py-3 shadow-sm border">
                      <div className="text-xs text-gray-500 mb-2">📖 故事叙述</div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{content.storyNarrative}</p>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* 生成的图片 - 按逻辑顺序（sceneIndex）排序显示 */}
            {content.images && Array.isArray(content.images) && content.images.length > 0 ? (
              [...content.images]
                .sort((a: any, b: any) => (a.sceneIndex || 0) - (b.sceneIndex || 0))
                .map((image, index) => (
              <div key={index} className="flex justify-start">
                <div className="max-w-[80%] bg-gradient-to-r from-green-50 to-emerald-50 text-gray-800 rounded-2xl px-4 py-3 shadow-sm border">
                  <div className="text-xs text-gray-500 mb-2">
                    🎬 {image.sceneTitle || `场景 ${index + 1}`}
                    <span className="ml-2 text-gray-400">#{image.sceneIndex !== undefined ? image.sceneIndex + 1 : index + 1}</span>
                  </div>
                  
                  {/* 图片 */}
                  <div className="my-3">
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={image.imageUrl}
                        alt={image.sceneTitle || `Scene ${index + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
                          console.error('图片加载失败:', image.imageUrl)
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTI1SDIyNVYxNzVIMTc1VjEyNVoiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+PC9wPgo8L3N2Zz4K'
                          e.currentTarget.alt = '图片加载失败'
                        }}
                        onLoad={() => {
                          console.log('图片加载成功:', image.imageUrl)
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* 文字内容 */}
                  {image.story && (
                    <div className="mt-3 text-sm text-gray-700 leading-relaxed">
                      {image.story}
                    </div>
                  )}
                </div>
              </div>
            ))
            ) : (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-gray-50 text-gray-600 rounded-2xl px-4 py-3 shadow-sm border">
                  <p className="text-sm">📷 图片正在生成中，请稍后刷新查看...</p>
                </div>
              </div>
            )}
            
            {/* 评论区域 - 只在已发布的内容显示，紧跟在图文内容之后 */}
            {content.status === 'published' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">💬 评论 ({comments.length})</h3>
                
                {/* 评论输入框 */}
                <div className="mb-6">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="写下你的评论..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim() || isSubmittingComment}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingComment ? '提交中...' : '发表评论'}
                    </button>
                  </div>
                </div>
                
                {/* 评论列表 */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">暂无评论，快来发表第一条评论吧~</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {comment.author.name?.[0] || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{comment.author.name || '匿名用户'}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(comment.createdAt).toLocaleString('zh-CN')}
                              </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
      
      {/* 继续创作功能 - 只在未发布的内容显示 */}
      {content.status !== 'published' && (
        <div className="max-w-4xl mx-auto mt-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="text"
                  placeholder="输入你的新想法或故事..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget.value.trim()
                      if (input) {
                        // 跳转到聊天页面，带上输入内容
                        router.push(`/chat-new?prompt=${encodeURIComponent(input)}&continue=${contentId}`)
                      }
                    }
                  }}
                />
                <button
                  onClick={() => router.push(`/chat-new?continue=${contentId}`)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  继续创作
                </button>
              </div>
              <p className="text-sm text-gray-500 text-center">
                输入新内容继续创作，或点击按钮基于这个故事记录继续
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

