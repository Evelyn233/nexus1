'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Image as ImageIcon, MessageCircle, Play } from 'lucide-react'
import { getUserGeneratedContents, UserGeneratedContentRecord } from '@/lib/userContentStorageService'

export default function HistoryPage() {
  const router = useRouter()
  const [contents, setContents] = useState<UserGeneratedContentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    loadContents()
  }, [])

  const loadContents = async () => {
    try {
      setLoading(true)
      console.log('🔍 [HISTORY] 开始加载历史记录...')
      console.log('🔍 [HISTORY] 调用getUserGeneratedContents(20, 0)...')
      const result = await getUserGeneratedContents(20, 0)
      console.log('🔍 [HISTORY] getUserGeneratedContents返回:', result)
      
      console.log('📊 [HISTORY] API返回结果:', {
        success: result.success,
        contentsLength: result.contents?.length || 0,
        total: result.total || 0,
        error: result.error
      })
      
      if (result.success && result.contents) {
        // 调试：查看第一个记录的数据结构
        if (result.contents.length > 0) {
          console.log('🔍 [HISTORY] 第一个记录的数据结构:', {
            id: result.contents[0].id,
            initialPrompt: result.contents[0].initialPrompt,
            storyNarrative: result.contents[0].storyNarrative,
            category: result.contents[0].category,
            imageCount: result.contents[0].imageCount
          })
        }
        
        setContents(result.contents)
        setTotal(result.total || 0)
        setHasMore(result.hasMore || false)
        console.log('✅ [HISTORY] 加载历史记录成功:', result.contents.length)
      } else {
        console.error('❌ [HISTORY] 加载历史记录失败:', result.error)
        // 显示错误信息给用户
        alert(`加载历史记录失败: ${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('❌ [HISTORY] 加载异常:', error)
      alert(`加载异常: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        return '日期未知'
      }
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      console.error('日期格式化错误:', error, dateStr)
      return '日期未知'
    }
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

        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
          你的故事记录
        </h1>
        <p className="text-gray-600 mt-2">
          共 {total} 个故事创作
        </p>
      </div>

      {/* 内容列表 */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">加载中...</p>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">还没有故事记录</p>
            <button
              onClick={() => router.push('/home')}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              开始创作
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {contents.map((content) => (
              <div
                key={content.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 cursor-pointer max-w-4xl mx-auto"
                onClick={() => {
                  console.log('查看内容:', content.id)
                  router.push(`/history/${content.id}`)
                }}
              >
                {/* 聊天记录标题 - 生成有意义的标题 */}
                <div className="mb-3">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {(() => {
                      // 调试信息
                      console.log('🔍 [HISTORY] 生成标题，完整数据:', {
                        id: content.id,
                        storyNarrative: content.storyNarrative,
                        initialPrompt: content.initialPrompt,
                        category: content.category,
                        hasStory: !!content.storyNarrative,
                        hasPrompt: !!content.initialPrompt
                      })
                      
                      // ✅ 优先使用用户的原始输入（最清晰直观）
                      if (content.initialPrompt && content.initialPrompt.trim()) {
                        const cleanText = content.initialPrompt.replace(/\s+/g, ' ').trim()
                        const title = cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText
                        console.log('✅ [HISTORY] 使用初始输入生成标题:', title)
                        return title
                      }
                      
                      // 如果没有用户输入，再使用故事叙述
                      if (content.storyNarrative && content.storyNarrative.trim()) {
                        const cleanText = content.storyNarrative.replace(/\s+/g, ' ').trim()
                        const title = cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText
                        console.log('✅ [HISTORY] 使用故事叙述生成标题:', title)
                        return title
                      }
                      
                      // 尝试使用第一个问题或答案
                      if (content.questions && content.questions.length > 0) {
                        const firstQuestion = content.questions[0]
                        if (firstQuestion && firstQuestion.trim()) {
                          const cleanText = firstQuestion.replace(/\s+/g, ' ').trim()
                          const title = cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText
                          console.log('✅ [HISTORY] 使用第一个问题生成标题:', title)
                          return title
                        }
                      }
                      
                      if (content.answers && content.answers.length > 0) {
                        const firstAnswer = content.answers[0]
                        if (firstAnswer && firstAnswer.trim()) {
                          const cleanText = firstAnswer.replace(/\s+/g, ' ').trim()
                          const title = cleanText.length > 50 ? cleanText.substring(0, 50) + '...' : cleanText
                          console.log('✅ [HISTORY] 使用第一个回答生成标题:', title)
                          return title
                        }
                      }
                      
                      // 最后尝试基于图片数量生成标题
                      if (content.imageCount && content.imageCount > 0) {
                        const title = `生成了${content.imageCount}张图片的故事`
                        console.log('✅ [HISTORY] 使用图片数量生成标题:', title)
                        return title
                      }
                      
                      console.log('⚠️ [HISTORY] 使用默认标题')
                      return '故事记录'
                    })()}
                </h3>

                </div>

                {/* 图片数量和状态 */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <ImageIcon className="w-4 h-4" />
                  <span>{content.imageCount} 张图片</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-green-600">已完成</span>
                </div>

                {/* 分类和标签 */}
                <div className="flex items-center gap-2 mb-3">
                  {content.category && content.category !== 'daily' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {content.category}
                    </span>
                  )}
                  {content.tags && content.tags.length > 0 && (
                    content.tags.slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))
                  )}
                </div>

                {/* 时间 */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(content.createdAt)}</span>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/chat-new?continue=${content.id}`)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Play className="w-4 h-4" />
                    继续创作
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/history/${content.id}`)
                    }}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    查看详情
                  </button>
                  </div>
              </div>
            ))}
          </div>
        )}

        {/* 加载更多 */}
        {hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={() => {
                // TODO: 加载更多
                console.log('加载更多')
              }}
              className="px-6 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
            >
              加载更多
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

