'use client'

import { useState, useEffect } from 'react'
import { X, MessageSquare, Image as ImageIcon, Trash2, Clock, Search } from 'lucide-react'
import { UserGeneratedContentRecord } from '@/lib/userContentStorageService'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatSession {
  sessionId: string
  title: string
  messages: ChatMessage[]
  initialPrompt: string
  answers: string[]
  questions: string[]
  createdAt: string
  updatedAt: string
}

interface ChatHistorySidebarProps {
  isOpen: boolean
  onClose: () => void
  onSessionSelect: (session: ChatSession) => void
}

export default function ChatHistorySidebar({ isOpen, onClose, onSessionSelect }: ChatHistorySidebarProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'images'>('images')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [images, setImages] = useState<UserGeneratedContentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // 加载历史记录（只保留一个 useEffect，避免重复加载）
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 [SIDEBAR] 侧边栏打开，开始加载数据，当前标签:', activeTab)
      loadHistory()
    }
  }, [isOpen, activeTab])

  // 监听images状态变化
  useEffect(() => {
    console.log('🔍 [SIDEBAR] images状态变化:', {
      length: images.length,
      firstId: images[0]?.id || 'none',
      activeTab: activeTab
    })
  }, [images, activeTab])

  const loadHistory = async () => {
    setIsLoading(true)
    try {
      if (activeTab === 'chats') {
        const response = await fetch('/api/chat-sessions')
        const data = await response.json()
        setSessions(data.sessions || [])
      } else {
        // 🔥 使用新的用户生成内容API
        // 🔥 重要：已发布的内容（包括 INLIFE 和 INSTYLE）也应该在聊天记录中显示，不会被删除
        console.log('🔍 [SIDEBAR] 开始加载用户生成内容...')
        const response = await fetch('/api/user/generated-content?limit=20&offset=0')
        console.log('🔍 [SIDEBAR] API响应状态:', response.status)
        
        const data = await response.json()
        console.log('🔍 [SIDEBAR] API返回数据:', {
          success: data.success,
          contentsLength: data.contents?.length || 0,
          total: data.total || 0,
          error: data.error,
          publishedCount: data.contents?.filter((c: any) => c.status === 'published').length || 0
        })
        
        if (data.success && data.contents) {
          // 🔥 转换数据格式以匹配现有接口
          // 🔥 注意：不过滤已发布的内容，所有内容（包括已发布的）都应该显示在聊天记录中
          const formattedImages = data.contents.map((content: any) => {
            console.log('🔍 [SIDEBAR] 处理内容:', {
              id: content.id,
              initialPrompt: content.initialPrompt,
              hasPrompt: !!content.initialPrompt,
              promptLength: content.initialPrompt?.length || 0,
              imageCount: content.imageCount,
              status: content.status
            })
            return {
              id: content.id,
              filename: `content-${content.id}`,
              title: content.title || '', // 🔥 AI生成的标题
              prompt: content.initialPrompt || '',
              initialPrompt: content.initialPrompt || '',
              storyNarrative: content.storyNarrative || '',
              savedAt: content.createdAt,
              createdAt: content.createdAt,
              localPath: '',
              imageCount: content.imageCount || 0,
              category: content.category,
              questions: content.questions || [],
              answers: content.answers || [],
              status: content.status || 'completed' // 添加状态字段
            }
          })
          console.log('✅ [SIDEBAR] 格式化后的数据:', formattedImages.length, '条')
          console.log('🔍 [SIDEBAR] 设置images状态前:', {
            currentImagesLength: images.length,
            newImagesLength: formattedImages.length,
            firstNewImage: formattedImages[0]?.id || 'none'
          })
          setImages(formattedImages)
          console.log('✅ [SIDEBAR] 已调用setImages')
        } else {
          console.log('❌ [SIDEBAR] API返回失败或无数据:', data)
          setImages([])
        }
      }
    } catch (error) {
      console.error('❌ [SIDEBAR] 加载历史记录失败:', error)
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('确定要删除这个对话吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/chat-sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.sessionId !== sessionId))
      }
    } catch (error) {
      console.error('删除会话失败:', error)
    }
  }

  const deleteImage = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('确定要删除这张图片吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/delete-image?filename=${filename}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setImages(images.filter(img => img.id !== filename))
      }
    } catch (error) {
      console.error('删除图片失败:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return '今天'
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  // 搜索过滤函数
  const filteredImages = images.filter(content => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      content.initialPrompt?.toLowerCase().includes(query) ||
      content.storyNarrative?.toLowerCase().includes(query)
    )
  })

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* 侧边栏 */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* 头部 */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">历史记录</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <button
              onClick={() => {
                window.location.href = '/'
                onClose()
              }}
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium mb-3"
            >
              + 新对话
            </button>
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索创作内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 标签 - 只显示故事记录 */}
          <div className="flex border-b border-gray-200">
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-teal-600 border-b-2 border-teal-600">
              <ImageIcon className="w-4 h-4" />
              故事记录
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <>
                {/* 只显示故事记录，移除聊天记录 */}
                {false ? (
                  <div className="p-4 space-y-2">
                    {sessions.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>暂无对话记录</p>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.sessionId}
                          onClick={() => {
                            onSessionSelect(session)
                            onClose()
                          }}
                          className="group p-4 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-800 truncate">
                                {session.title}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {session.initialPrompt || session.messages[0]?.content || ''}
                              </p>
                              <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                {formatDate(session.createdAt)}
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteSession(session.sessionId, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {(() => {
                      console.log('🔍 [SIDEBAR] 渲染时检查images状态:', {
                        imagesLength: images.length,
                        isLoading: isLoading,
                        activeTab: activeTab,
                        firstImage: images[0]?.id || 'none'
                      })
                      return null
                    })()}
                    {filteredImages.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>{searchQuery ? '未找到匹配的记录' : '暂无图片记录'}</p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-3 px-4 py-2 text-sm text-teal-600 hover:text-teal-700"
                          >
                            清除搜索
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredImages.map((content: any) => (
                        <div
                          key={content.id}
                          className="group relative rounded-lg overflow-hidden bg-gray-50 cursor-pointer border border-gray-200 hover:border-teal-300 transition-colors"
                          onClick={() => {
                            window.location.href = `/history/${content.id}`
                            onClose()
                          }}
                        >
                          <div className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ImageIcon className="w-4 h-4 text-teal-600" />
                              <span className="text-xs text-teal-600 font-medium">
                                {content.imageCount} 张图片
                              </span>
                              {content.status === 'published' && (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">
                                  ✓ 已发布
                                </span>
                              )}
                              {content.status === 'draft' && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  草稿
                                </span>
                              )}
                              {content.status === 'private' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  🔒 私密
                                </span>
                              )}
                              {content.category && content.category !== 'daily' && (
                                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                                  {content.category}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                              {(() => {
                                // 🔥 优先使用AI生成的标题（简洁明了）
                                if (content.title) {
                                  return content.title
                                }
                                
                                // 如果没有标题，使用用户的原始输入
                                if (content.initialPrompt) {
                                  const cleanText = content.initialPrompt.replace(/\s+/g, ' ').trim()
                                  return cleanText.length > 60 ? cleanText.substring(0, 60) + '...' : cleanText
                                }
                                
                                // 如果没有用户输入，再使用故事叙述
                                if (content.storyNarrative) {
                                  const cleanText = content.storyNarrative.replace(/\s+/g, ' ').trim()
                                  return cleanText.length > 60 ? cleanText.substring(0, 60) + '...' : cleanText
                                }
                                
                                return '故事记录'
                              })()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

