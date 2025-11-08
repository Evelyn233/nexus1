'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { History, X, Image as ImageIcon } from 'lucide-react'
import ContentCard from '@/components/ContentCard'
import InputSection from '@/components/InputSection'
import UserInfoBar from '@/components/UserInfoBar'
import ClientOnly from '@/components/ClientOnly'
import ChatHistorySidebar from '@/components/ChatHistorySidebar'
import { QUICK_GENERATE_OPTIONS } from '@/lib/config'
import { resetUserInfo, getUserInfo, getUserInfoDescription, getCurrentUserName, setCurrentUserName, getUserList, addUserToList, removeUserFromList, getLatestUserReport, getUserReports } from '@/lib/userInfoService'
import { getUserGeneratedContents } from '@/lib/userContentStorageService'

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, session, isLoading } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [userContent, setUserContent] = useState<any[]>([])
  const [contentLoading, setContentLoading] = useState(true)
  const [publishedContent, setPublishedContent] = useState<any[]>([])
  const [publishedLoading, setPublishedLoading] = useState(true)
  const [customQuickOptions, setCustomQuickOptions] = useState<string[]>(() => {
    // 从 localStorage 读取自定义选项
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customQuickOptions')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  // 检查 URL 参数，如果有 openHistory=true，自动打开历史记录侧边栏
  useEffect(() => {
    const openHistory = searchParams.get('openHistory')
    const refresh = searchParams.get('refresh')
    
    if (openHistory === 'true') {
      setIsSidebarOpen(true)
    }
    
    // 如果有refresh参数，刷新已发布内容
    if (refresh === 'true') {
      console.log('🔄 [HOME] 检测到刷新参数，重新加载已发布内容...')
      loadPublishedContent()
    }
    
    // 清除 URL 参数，避免刷新时重复执行
    if (openHistory === 'true' || refresh === 'true') {
      window.history.replaceState({}, '', '/home')
    }
  }, [searchParams])

  // 加载用户生成的内容
  useEffect(() => {
    if (isAuthenticated) {
      loadUserContent()
    }
  }, [isAuthenticated])

  // 加载已发布内容
  useEffect(() => {
    loadPublishedContent()
  }, [])

  const loadUserContent = async () => {
    try {
      setContentLoading(true)
      console.log('🔍 [HOME] 加载用户生成内容...')
      const result = await getUserGeneratedContents(4, 0) // 只加载最新的4条
      
      if (result.success && result.contents) {
        console.log('✅ [HOME] 加载用户内容成功:', result.contents.length)
        setUserContent(result.contents)
      } else {
        console.log('⚠️ [HOME] 没有用户内容，使用静态数据')
        setUserContent([])
      }
    } catch (error) {
      console.error('❌ [HOME] 加载用户内容失败:', error)
      setUserContent([])
    } finally {
      setContentLoading(false)
    }
  }

  const normalizeImages = (images: any): any[] => {
    if (!images) return []
    if (Array.isArray(images)) return images
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images)
        return Array.isArray(parsed) ? parsed : []
      } catch (error) {
        console.warn('⚠️ [HOME] 解析 images 字段失败:', error)
        return []
      }
    }
    return []
  }

  const getFirstImageUrl = (images: any[]): string => {
    if (!Array.isArray(images)) return ''
    const imageObj = images.find((img) => img?.imageUrl || img?.url || img?.src || img?.image_path)
    if (!imageObj) return ''
    return imageObj.imageUrl || imageObj.url || imageObj.src || imageObj.image_path || ''
  }

  const loadPublishedContent = async () => {
    try {
      setPublishedLoading(true)
      console.log('🔍 [HOME] 加载已发布内容...')
      const response = await fetch('/api/published-content?limit=8')
      console.log('🔍 [HOME] API响应状态:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 [HOME] API返回数据:', {
          success: data.success,
          contentsLength: data.contents?.length || 0,
          total: data.total || 0,
          contents: data.contents
        })
        
        if (data.success && Array.isArray(data.contents)) {
          console.log('✅ [HOME] 加载已发布内容成功:', data.contents.length, '个作品')
          const normalized = data.contents.map((content: any) => {
            const images = normalizeImages(content.images)
            const sortedImages = Array.isArray(images)
              ? [...images].sort((a, b) => (a?.sceneIndex || 0) - (b?.sceneIndex || 0))
              : []
            return {
              ...content,
              images: sortedImages,
              firstImageUrl: getFirstImageUrl(sortedImages)
            }
          })
          setPublishedContent(normalized)
        } else {
          console.warn('⚠️ [HOME] API返回数据格式异常:', data)
          setPublishedContent([])
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ [HOME] API返回错误:', response.status, errorData)
        setPublishedContent([])
      }
    } catch (error) {
      console.error('❌ [HOME] 加载已发布内容失败:', error)
      setPublishedContent([])
    } finally {
      setPublishedLoading(false)
    }
  }
  
  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-magazine-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const staticContentData = [
    {
      id: 1,
      image: '/loneliness.jpeg',
      title: 'Emotional Style Guide',
      subtitle: '',
      type: 'article' as const,
      authorInitial: 'E',
      authorName: 'Evelyn'
    },
    {
      id: 2,
      image: '/images/night.jpeg',
      title: '☕ Moon Milk Foam & 2AM Documents',
      subtitle: '',
      type: 'article' as const,
      authorInitial: 'A',
      authorName: 'Alex'
    },
    {
      id: 3,
      image: '/images/subway.jpeg',
      title: 'Everyone on the subway stares at their phones, but no one is really communicating',
      subtitle: '',
      type: 'article' as const,
      authorInitial: 'S',
      authorName: 'Sophie'
    },
    {
      id: 4,
      image: '/images/hannibal.jpeg?v=2',
      title: 'I Want to Be a Female Villain Like Hannibal',
      subtitle: '',
      type: 'article' as const,
      authorInitial: 'H',
      authorName: 'Hannibal'
    },
    {
      id: 5,
      image: '/images/divorse.jpeg',
      title: 'The Missing Manual for Connection',
      subtitle: '',
      type: 'article' as const,
      authorInitial: 'L',
      authorName: 'Luna'
    },
    {
      id: 6,
      title: 'AI Life Suggestions',
      subtitle: 'Click to generate personalized advice',
      suggestion: '🌿 Weekend Revival Manual - A spiritual escape outlet designed for highly sensitive urban dwellers',
      source: 'AI Life Suggestions',
      type: 'ai-suggestion' as const,
      bgColor: 'bg-magazine-light-gray',
      authorInitial: 'E',
      authorName: 'Evelyn'
    }
  ]

  const handleSend = () => {
    if (inputValue.trim()) {
      // 跳转到聊天页面进行深度提问
      router.push(`/chat-new?prompt=${encodeURIComponent(inputValue)}`)
      setInputValue('')
    }
  }

  const handleAddCustomOption = (value: string) => {
    if (value.trim() && !customQuickOptions.includes(value.trim())) {
      const newOptions = [...customQuickOptions, value.trim()]
      setCustomQuickOptions(newOptions)
      // 保存到 localStorage
      localStorage.setItem('customQuickOptions', JSON.stringify(newOptions))
      console.log('✅ [HOME] 已添加自定义快速生成选项:', value.trim())
    }
  }

  const handleImageUpload = (file: File) => {
    // 创建图片预览
    const reader = new FileReader()
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string
      console.log('📸 [HOME] 图片已上传:', file.name)
      // 可以在这里显示图片预览或保存图片
      // 暂时先显示提示
      alert(`图片 "${file.name}" 已上传`)
    }
    reader.readAsDataURL(file)
  }

  const handleImageToAI = async (file: File) => {
    try {
      console.log('🤖 [HOME] 准备将图片发送给AI:', file.name)
      
      // 将图片转换为base64
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Image = e.target?.result as string
        
        // 跳转到聊天页面，传递图片数据
        const imageData = {
          name: file.name,
          data: base64Image,
          type: file.type
        }
        
        // 将图片数据编码到URL中（或使用其他方式传递）
        const encodedData = encodeURIComponent(JSON.stringify(imageData))
        router.push(`/chat-new?image=${encodedData}`)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('❌ [HOME] 处理图片失败:', error)
      alert('处理图片失败，请重试')
    }
  }

  const handleSessionSelect = (session: any) => {
    console.log('加载历史会话:', session)
    // 跳转到聊天页面并传递会话ID
    router.push(`/chat-new?sessionId=${session.sessionId}`)
  }


  return (
    <div className="min-h-screen bg-white">
      {/* 历史记录侧边栏 */}
      <ChatHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSessionSelect={handleSessionSelect}
      />

      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
        <div className="flex items-center">
          <img 
            src="/inflow-logo.jpeg" 
            alt="logo" 
            className="w-24 h-16 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push('/home')}
          />
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-magazine-gray hover:text-magazine-primary transition-colors"
            title="历史记录"
          >
            <History className="w-6 h-6" />
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="text-magazine-gray hover:text-magazine-primary transition-colors"
            title="我的主页"
          >
            👤
          </button>
          <button
            onClick={() => router.push('/gallery')}
            className="text-magazine-gray hover:text-magazine-primary transition-colors"
            title="图片画廊"
          >
            🖼️
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 pb-40 max-w-md mx-auto">
        {/* 社区作品区域 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">🌟 社区作品</h2>
            {!publishedLoading && (
              <span className="text-xs text-gray-500">{publishedContent.length} 个作品</span>
            )}
          </div>
          
          {publishedLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : publishedContent.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {publishedContent.map((content) => {
                const firstImageUrl = content.firstImageUrl || getFirstImageUrl(content.images)
                return (
                  <div 
                    key={content.id} 
                    className="h-64 cursor-pointer"
                    onClick={() => router.push(`/history/${content.id}`)}
                  >
                    <div className="relative h-full bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all group">
                      {firstImageUrl ? (
                        <img
                          src={firstImageUrl}
                          alt={content.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-teal-400 opacity-50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                          {content.title || content.initialPrompt || '已发布作品'}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/80">{content.author?.name || '匿名用户'}</span>
                          <span className="text-white/60">{content.imageCount || 0} 张</span>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full">
                        已发布
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 text-sm">暂无已发布的作品</p>
              <p className="text-gray-400 text-xs mt-2">发布你的作品，让更多人看到吧！</p>
            </div>
          )}
        </div>

        {/* 精选内容 */}
        <div className="mb-3">
          <h2 className="text-lg font-bold text-gray-800">📖 精选内容</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {staticContentData.map((item) => (
            <div key={item.id} className="h-64">
              <ContentCard data={item} />
            </div>
          ))}
        </div>
      </main>

      {/* Quick Generate Buttons - 横向滚动 */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-white max-w-md mx-auto">
        <div className="mb-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-medium text-gray-500">快速生成</h2>
            <button
              onClick={() => router.push('/profile')}
              className="text-xs text-magazine-primary hover:text-magazine-secondary flex items-center space-x-1"
            >
              <span>👤</span>
              <span>我的信息</span>
            </button>
          </div>
          {/* 🔥 横向滚动容器 */}
          <div className="overflow-x-auto scrollbar-hide -mx-3 px-3">
            <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
              {/* 默认快速生成选项 */}
              {QUICK_GENERATE_OPTIONS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInputValue(prompt)}
                  className="px-3 py-1.5 text-xs bg-magazine-light-gray text-magazine-primary rounded-full hover:bg-magazine-accent transition-colors whitespace-nowrap flex-shrink-0"
                >
                  {prompt}
                </button>
              ))}
              {/* 自定义快速生成选项 */}
              {customQuickOptions.map((prompt, index) => (
                <button
                  key={`custom-${index}`}
                  onClick={() => setInputValue(prompt)}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors whitespace-nowrap flex-shrink-0"
                  title="点击使用，长按删除"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    const newOptions = customQuickOptions.filter((_, i) => i !== index)
                    setCustomQuickOptions(newOptions)
                    localStorage.setItem('customQuickOptions', JSON.stringify(newOptions))
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Input Section - 无缝连接 */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100 max-w-md mx-auto z-10">
        <InputSection 
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onAdd={handleAddCustomOption}
          onImageUpload={handleImageUpload}
          onImageToAI={handleImageToAI}
        />
      </div>

      {/* User Profile Modal */}
      {showUserProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">我的信息</h2>
              <button
                onClick={() => setShowUserProfile(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <ClientOnly>
              <UserProfileContent />
            </ClientOnly>
            
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  setShowUserProfile(false)
                  router.push('/user-info')
                }}
                className="flex-1 bg-magazine-primary text-white py-2 px-4 rounded-lg hover:bg-magazine-secondary transition-colors"
              >
                编辑信息
              </button>
              <button
                onClick={() => {
                  resetUserInfo()
                  setShowUserProfile(false)
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                重新设置用户
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 用户信息内容组件
function UserProfileContent() {
  const { session } = useAuth()
  const [currentUserName, setCurrentUserNameState] = useState(getCurrentUserName())
  const [userList, setUserListState] = useState(getUserList())
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [userInfo, setUserInfo] = useState<any>(null)
  const [userMetadata, setUserMetadata] = useState<any>(null)
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
  
  // 从数据库获取当前登录用户的信息
  useEffect(() => {
    if (session?.user?.email) {
      loadUserInfoFromDB()
    } else {
      // 如果未登录，使用localStorage的数据（兼容旧逻辑）
      setUserInfo(getUserInfo())
      setIsLoadingUserInfo(false)
    }
  }, [session])
  
  const loadUserInfoFromDB = async () => {
    try {
      setIsLoadingUserInfo(true)
      console.log('🔍 [USER-PROFILE] 从数据库加载用户信息...')
      
      const response = await fetch('/api/user/info')
      if (response.ok) {
        const data = await response.json()
        console.log('✅ [USER-PROFILE] 数据库用户信息:', data)
        setUserInfo(data.userInfo)
        setUserMetadata(data.userMetadata)
        
        // 同步到localStorage（保持兼容性）
        if (data.userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(data.userInfo))
          if (data.userInfo.name) {
            setCurrentUserName(data.userInfo.name)
            setCurrentUserNameState(data.userInfo.name)
          }
        }
      } else {
        console.log('⚠️ [USER-PROFILE] 数据库无用户信息，使用localStorage')
        setUserInfo(getUserInfo())
      }
    } catch (error) {
      console.error('❌ [USER-PROFILE] 加载用户信息失败:', error)
      setUserInfo(getUserInfo())
    } finally {
      setIsLoadingUserInfo(false)
    }
  }
  
  // ⚠️ 废弃：旧的自动分析服务已废弃
  // 现在使用 userMetadataService 通过用户对话来生成分析数据
  // useEffect(() => {
  //   const hasGenerated = checkAndGenerateAnalysis()
  //   if (hasGenerated) {
  //     window.location.reload()
  //   }
  // }, [])
  
  const [userInfoDescription, setUserInfoDescription] = useState<string>('')
  const [latestReport, setLatestReport] = useState<any>(null)
  const [allReports, setAllReports] = useState<any[]>([])
  
  // 异步加载用户信息
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const description = await getUserInfoDescription()
        setUserInfoDescription(description)
        setLatestReport(getLatestUserReport())
        setAllReports(getUserReports())
      } catch (error) {
        console.error('加载用户数据失败:', error)
      }
    }
    
    loadUserData()
  }, [currentUserName])
  
  // 检查是否有任何用户信息
  const hasAnyInfo = userInfo && (userInfo.gender || userInfo.height || userInfo.weight || userInfo.location || userInfo.personality || userInfo.birthDate?.year)
  
  // 调试信息（可以在控制台查看）
  console.log('🔍 [USER-PROFILE] 用户信息状态:', {
    currentUserName,
    userList,
    hasAnyInfo,
    userInfo,
    userMetadata,
    isLoadingUserInfo,
    sessionUser: session?.user?.name,
    userInfoDescription: userInfoDescription ? '有深度分析' : '无深度分析'
  })
  
  // 如果正在加载，显示加载状态
  if (isLoadingUserInfo) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-magazine-primary mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">加载用户信息...</p>
      </div>
    )
  }
  
  // 切换用户
  const switchUser = (name: string) => {
    setCurrentUserName(name)
    setCurrentUserName(name)
    setShowUserSelector(false)
    window.location.reload() // 重新加载页面以更新数据
  }
  
  // 添加新用户
  const addNewUser = () => {
    if (newUserName.trim()) {
      addUserToList(newUserName.trim())
      setUserListState(getUserList())
      setNewUserName('')
      switchUser(newUserName.trim())
    }
  }
  
  // 删除用户
  const deleteUser = (name: string) => {
    if (confirm(`确定要删除用户 "${name}" 的所有信息吗？`)) {
      removeUserFromList(name)
      setUserListState(getUserList())
      if (currentUserName === name) {
        setCurrentUserName('')
        setCurrentUserNameState('')
      }
    }
  }
  
  // 如果没有当前用户，显示用户选择界面
  if (!currentUserName) {
    return (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-lg font-medium text-gray-600">选择或创建用户</p>
        </div>
        
        {/* 用户列表 */}
        {userList.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">已有用户</h3>
            <div className="space-y-2">
              {userList.map((name) => (
                <div key={name} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-gray-900">{name}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => switchUser(name)}
                      className="px-3 py-1 bg-magazine-primary text-white text-sm rounded hover:bg-magazine-secondary"
                    >
                      选择
                    </button>
                    <button
                      onClick={() => deleteUser(name)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 创建新用户 */}
        <div className="bg-magazine-light-gray p-4 rounded-lg">
          <h3 className="font-medium text-magazine-dark mb-3">创建新用户</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="输入用户名字"
              className="flex-1 px-3 py-2 border border-magazine-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-magazine-primary"
              onKeyPress={(e) => e.key === 'Enter' && addNewUser()}
            />
            <button
              onClick={addNewUser}
              disabled={!newUserName.trim()}
              className="px-4 py-2 bg-magazine-primary text-white rounded-lg hover:bg-magazine-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // 如果有当前用户但没有信息，显示设置提示
  if (!hasAnyInfo) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <div className="text-6xl mb-2">👤</div>
          <p className="text-lg font-medium text-gray-600">用户 "{currentUserName}" 还没有设置信息</p>
          <p className="text-sm text-gray-500 mt-2">点击"编辑信息"开始设置个人信息</p>
        </div>
        
        {/* 用户切换按钮 */}
        <div className="mt-4">
          <button
            onClick={() => setShowUserSelector(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm mr-2"
          >
            切换用户
          </button>
          <button
            onClick={() => {
              setCurrentUserName('')
              setCurrentUserNameState('')
              window.location.reload()
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            退出登录
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* 当前用户信息 */}
      <div className="bg-magazine-light-gray p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-magazine-dark">当前用户</h3>
            <p className="text-lg font-semibold text-magazine-primary">{currentUserName}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUserSelector(true)}
              className="px-3 py-1 bg-magazine-primary text-white text-sm rounded hover:bg-magazine-secondary"
            >
              切换用户
            </button>
            <button
              onClick={() => {
                setCurrentUserName('')
                setCurrentUserNameState('')
                window.location.reload()
              }}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              退出
            </button>
          </div>
        </div>
      </div>
      
      {/* 基本信息 - 紧凑显示 */}
      <div className="bg-gray-50 p-3 rounded-lg mt-2">
        <h3 className="font-medium text-gray-900 mb-2 text-sm">基本信息</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">性别：</span>
            <span className="text-gray-900">{userInfo.gender === 'male' ? '男' : userInfo.gender === 'female' ? '女' : '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">年龄：</span>
            <span className="text-gray-900">{userInfo.age ? `${userInfo.age}岁` : '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">身高：</span>
            <span className="text-gray-900">{userInfo.height ? `${userInfo.height}cm` : '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">体重：</span>
            <span className="text-gray-900">{userInfo.weight ? `${userInfo.weight}kg` : '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">所在地：</span>
            <span className="text-gray-900">{userInfo.location || '未设置'}</span>
          </div>
        </div>
      </div>

      {/* 生日信息 */}
      {userInfo.birthDate.year && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">生日信息</h3>
          <div className="text-xs text-gray-600">
            {userInfo.birthDate.year}年{userInfo.birthDate.month}月{userInfo.birthDate.day}日
            {userInfo.birthDate.hour && ` ${userInfo.birthDate.hour}时`}
          </div>
        </div>
      )}

      {/* 性格描述 */}
      {userInfo.personality && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">性格描述</h3>
          <div className="text-xs text-gray-600">{userInfo.personality}</div>
        </div>
      )}

      {/* 深度分析 - 隐藏，只作为后台数据存储 */}
      {/* {userInfoDescription && (
        <div className="bg-magazine-light-gray p-4 rounded-lg">
          <h3 className="font-medium text-magazine-dark mb-2">深度分析</h3>
          <div className="text-sm text-magazine-primary whitespace-pre-wrap">{userInfoDescription}</div>
        </div>
      )} */}

      {/* 用户简介报告 */}
      {latestReport && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">最新对话报告</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <div>
              <span className="font-medium">对话总结：</span>
              <span>{latestReport.conversationSummary}</span>
            </div>
            <div>
              <span className="font-medium">情感状态：</span>
              <span>{latestReport.emotionalState}</span>
            </div>
            {latestReport.personalityInsights.length > 0 && (
              <div>
                <span className="font-medium">性格洞察：</span>
                <div className="mt-1">
                  {latestReport.personalityInsights.map((insight: string, index: number) => (
                    <div key={index} className="text-xs bg-blue-100 px-2 py-1 rounded mr-1 mb-1 inline-block">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {latestReport.recommendations.length > 0 && (
              <div>
                <span className="font-medium">建议：</span>
                <div className="mt-1">
                  {latestReport.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="text-xs bg-green-100 px-2 py-1 rounded mr-1 mb-1 inline-block">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-blue-600 mt-2">
              对话次数：{latestReport.conversationCount} | 总对话时间：{latestReport.totalConversationTime}
            </div>
          </div>
        </div>
      )}

      {/* 报告历史 */}
      {allReports.length > 1 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">报告历史</h3>
          <div className="text-sm text-gray-600 space-y-1">
            {allReports.slice(-5).reverse().map((report, index) => (
              <div key={index} className="flex justify-between items-center">
                <span>{new Date(report.reportDate).toLocaleDateString()}</span>
                <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                  {report.conversationSummary.substring(0, 20)}...
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 用户选择器弹窗 */}
      {showUserSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">选择用户</h2>
              <button
                onClick={() => setShowUserSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 用户列表 */}
              {userList.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">已有用户</h3>
                  <div className="space-y-2">
                    {userList.map((name) => (
                      <div key={name} className="flex items-center justify-between p-2 bg-white rounded border">
                        <span className="text-gray-900">{name}</span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => switchUser(name)}
                            className="px-3 py-1 bg-magazine-primary text-white text-sm rounded hover:bg-magazine-secondary"
                          >
                            选择
                          </button>
                          <button
                            onClick={() => deleteUser(name)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 创建新用户 */}
              <div className="bg-magazine-light-gray p-4 rounded-lg">
                <h3 className="font-medium text-magazine-dark mb-3">创建新用户</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="输入用户名字"
                    className="flex-1 px-3 py-2 border border-magazine-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-magazine-primary"
                    onKeyPress={(e) => e.key === 'Enter' && addNewUser()}
                  />
                  <button
                    onClick={addNewUser}
                    disabled={!newUserName.trim()}
                    className="px-4 py-2 bg-magazine-primary text-white rounded-lg hover:bg-magazine-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    创建
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
