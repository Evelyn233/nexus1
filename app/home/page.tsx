'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'
import { History, X, Share2, LogOut } from 'lucide-react'
import InputSection from '@/components/InputSection'
import ClientOnly from '@/components/ClientOnly'
import ChatHistorySidebar from '@/components/ChatHistorySidebar'
import DailyQuestionCard from '@/components/DailyQuestionCard'
import Drawer from '@/components/Drawer'
import NewUserOnboarding, { getOnboardingDone } from '@/components/NewUserOnboarding'
import { QUICK_GENERATE_OPTIONS } from '@/lib/config'
import { resetUserInfo, getUserInfo, getUserInfoDescription, getCurrentUserName, setCurrentUserName, getUserList, addUserToList, removeUserFromList, getLatestUserReport, getUserReports } from '@/lib/userInfoService'

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [customQuickOptions, setCustomQuickOptions] = useState<string[]>(() => {
    // 从 localStorage 读取自定义选项
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('customQuickOptions')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [showNewUserOnboarding, setShowNewUserOnboarding] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (session && !getOnboardingDone()) {
      setShowNewUserOnboarding(true)
    } else {
      setShowNewUserOnboarding(false)
    }
  }, [session])
  // 检查 URL 参数，如果有 openHistory=true，自动打开历史记录侧边栏
  useEffect(() => {
    const openHistory = searchParams.get('openHistory')
    if (openHistory === 'true') {
      setIsSidebarOpen(true)
      window.history.replaceState({}, '', '/profile')
    }
  }, [searchParams])

  // /home 不再阻塞等待 session：直接显示页面，session 在后台解析（middleware 已允许未登录访问 /home）
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
      alert(`Image "${file.name}" uploaded`)
    }
    reader.readAsDataURL(file)
  }

  const handleImageToAI = async (file: File) => {
    try {
      console.log('🤖 [HOME] 准备将图片发送给AI:', file.name)
      // 1. 转为 base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = () => reject(new Error('读取图片失败'))
        r.readAsDataURL(file)
      })
      // 2. 上传到服务器，避免 URL 过长（414）且便于编辑接口使用
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: file.name })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Image upload failed: ' + (err.error || res.status))
        return
      }
      const data = await res.json()
      const imageUrl = data?.url
      if (!imageUrl) {
        alert('Image upload failed: no URL returned')
        return
      }
      // 3. 跳转聊天页，带上图片 URL 并自动开始
      router.push(`/chat-new?prompt=${encodeURIComponent("I'm sharing an image, please take a look.")}&autoStart=true&image=${encodeURIComponent(imageUrl)}`)
    } catch (error) {
      console.error('❌ [HOME] 处理图片失败:', error)
      alert('Failed to process image, please try again')
    }
  }

  const handleSessionSelect = (session: any) => {
    console.log('加载历史会话:', session)
    // 跳转到聊天页面并传递会话ID
    router.push(`/chat-new?sessionId=${session.sessionId}`)
  }


  return (
    <div className="min-h-screen bg-white">
      {/* 新用户导引：注册后先上传照片 + 简要介绍，再进入聊天式完善 */}
      <NewUserOnboarding
        isOpen={showNewUserOnboarding}
        onClose={() => setShowNewUserOnboarding(false)}
        onComplete={(photoDataUrl, intro) => {
          setShowNewUserOnboarding(false)
          if (typeof window !== 'undefined') {
            try {
              if (photoDataUrl) {
                const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
                userInfo.image = photoDataUrl
                localStorage.setItem('userInfo', JSON.stringify(userInfo))
              }
              // intro 已由 NewUserOnboarding 存到 newUserOnboardingIntro，profile 加载时会用作一句话陈述
            } catch (_) {}
          }
          const base = intro?.trim()
            ? `I’m onboarding to build my profile. Here is my quick intro: "${intro.trim()}". Please ask me what I want to produce, build, or provide as a service, then help me polish it for my profile.`
            : 'I’m onboarding to build my profile. Please ask me what I want to produce, build, or provide as a service, then help me polish it for my profile.'
          router.push(`/chat-new?prompt=${encodeURIComponent(base)}&autoStart=true`)
        }}
      />
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
            src="/logo-nexus.jpeg" 
            alt="logo" 
            className="h-12 w-auto object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push('/profile')}
          />
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="text-gray-500 hover:text-primary transition-colors"
            title="History"
          >
            <History className="w-6 h-6" />
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="text-gray-500 hover:text-primary transition-colors"
            title="My Profile"
          >
            👤
          </button>
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
              title="换账号"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">换账号</span>
            </button>
          )}
          <button
            onClick={() => router.push('/profile')}
            className="text-gray-500 hover:text-primary transition-colors"
            title="Gallery"
          >
            🖼️
          </button>
        </div>
      </header>

      {/* mybio: single elon-ex - 变窄，与下方 max-w-md 对齐 */}
      <div className="w-full px-4 max-w-md mx-auto">
        {/* 卡片最上方：分享我的链接 */}
        <button
          type="button"
          onClick={async () => {
            if (!session) return
            try {
              const res = await fetch('/api/user/info', { credentials: 'include' })
              const data = await res.json().catch(() => ({}))
              const id = data?.userInfo?.id
              if (id && typeof window !== 'undefined' && navigator.clipboard?.writeText) {
                const url = `${window.location.origin}/u/${id}`
                await navigator.clipboard.writeText(url)
                setShareLinkCopied(true)
                setTimeout(() => setShareLinkCopied(false), 2000)
              }
            } catch (_) {}
          }}
          disabled={!session}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-4 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-t-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-4 h-4 text-teal-500 shrink-0" />
          <span>分享我的链接</span>
          {shareLinkCopied && <span className="text-xs text-teal-600">已复制</span>}
        </button>
        <h2 className="pt-4 text-lg font-bold text-gray-800">mybio</h2>
        <img src="/elon-ex.jpeg" alt="mybio" className="w-full max-w-[380px] mx-auto h-auto block rounded-lg" />
      </div>

      {/* 每日一问：回答 + 评价问题（下次更温和/更尖锐/保持等），存入用户数据库 */}
      <DailyQuestionCard />

      <main className="p-4 pb-40 max-w-md mx-auto" />

      {/* Quick Generate Buttons - Horizontal Scroll */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-white max-w-md mx-auto">
        <div className="mb-0">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-medium text-gray-500">Quick Generate</h2>
            <button
              onClick={() => router.push('/profile')}
              className="text-xs text-primary hover:text-primary-dark flex items-center space-x-1"
            >
              <span>👤</span>
              <span>My Info</span>
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
                  className="px-3 py-1.5 text-xs bg-gray-100 text-primary rounded-full hover:bg-primary-accent transition-colors whitespace-nowrap flex-shrink-0"
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

      {/* User Profile - 拉窗式，可缩小 */}
      <Drawer isOpen={showUserProfile} onClose={() => setShowUserProfile(false)} title="My Info">
        <div className="p-6">
          <ClientOnly>
            <UserProfileContent />
          </ClientOnly>
          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => { setShowUserProfile(false); router.push('/user-info') }}
              className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors"
            >
              Edit Info
            </button>
            <button
              onClick={() => { resetUserInfo(); setShowUserProfile(false) }}
              className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Reset User
            </button>
          </div>
        </div>
      </Drawer>
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Loading user information...</p>
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
    if (confirm(`Are you sure you want to delete all information for user "${name}"?`)) {
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
          <p className="text-lg font-medium text-gray-600">Select or Create User</p>
        </div>
        
        {/* User List */}
        {userList.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Existing Users</h3>
            <div className="space-y-2">
              {userList.map((name) => (
                <div key={name} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-gray-900">{name}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => switchUser(name)}
                      className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark"
                    >
                      Select
                    </button>
                    <button
                      onClick={() => deleteUser(name)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 创建新用户 */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-3">Create New User</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter user name"
              className="flex-1 px-3 py-2 border border-primary-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyPress={(e) => e.key === 'Enter' && addNewUser()}
            />
            <button
              onClick={addNewUser}
              disabled={!newUserName.trim()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
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
          <p className="text-lg font-medium text-gray-600">User "{currentUserName}" has not set information yet</p>
          <p className="text-sm text-gray-500 mt-2">Click "Edit Info" to start setting up personal information</p>
        </div>
        
        {/* 用户切换按钮 */}
        <div className="mt-4">
          <button
            onClick={() => setShowUserSelector(true)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm mr-2"
          >
            Switch User
          </button>
          <button
            onClick={() => {
              setCurrentUserName('')
              setCurrentUserNameState('')
              window.location.reload()
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* 当前用户信息 */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-800">Current User</h3>
            <p className="text-lg font-semibold text-primary">{currentUserName}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowUserSelector(true)}
              className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark"
            >
              Switch User
            </button>
            <button
              onClick={() => {
                setCurrentUserName('')
                setCurrentUserNameState('')
                window.location.reload()
              }}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Basic Info - Compact Display */}
      <div className="bg-gray-50 p-3 rounded-lg mt-2">
        <h3 className="font-medium text-gray-900 mb-2 text-sm">Basic Info</h3>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">Gender:</span>
            <span className="text-gray-900">{userInfo.gender === 'male' ? 'Male' : userInfo.gender === 'female' ? 'Female' : 'Not Set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Age:</span>
            <span className="text-gray-900">{userInfo.age ? `${userInfo.age} years` : 'Not Set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Height:</span>
            <span className="text-gray-900">{userInfo.height ? `${userInfo.height}cm` : 'Not Set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Weight:</span>
            <span className="text-gray-900">{userInfo.weight ? `${userInfo.weight}kg` : 'Not Set'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span className="text-gray-900">{userInfo.location || 'Not Set'}</span>
          </div>
        </div>
      </div>

      {/* Birthday Info */}
      {userInfo.birthDate.year && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">Birthday</h3>
          <div className="text-xs text-gray-600">
            {userInfo.birthDate.month}/{userInfo.birthDate.day}/{userInfo.birthDate.year}
            {userInfo.birthDate.hour && ` ${userInfo.birthDate.hour}:00`}
          </div>
        </div>
      )}

      {/* Personality Description */}
      {userInfo.personality && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2 text-sm">Personality</h3>
          <div className="text-xs text-gray-600">{userInfo.personality}</div>
        </div>
      )}

      {/* 深度分析 - 隐藏，只作为后台数据存储 */}
      {/* {userInfoDescription && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-medium text-gray-800 mb-2">深度分析</h3>
          <div className="text-sm text-primary whitespace-pre-wrap">{userInfoDescription}</div>
        </div>
      )} */}

      {/* 用户简介报告 */}
      {latestReport && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Latest Conversation Report</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <div>
              <span className="font-medium">Conversation Summary: </span>
              <span>{latestReport.conversationSummary}</span>
            </div>
            <div>
              <span className="font-medium">Emotional State: </span>
              <span>{latestReport.emotionalState}</span>
            </div>
            {latestReport.personalityInsights.length > 0 && (
              <div>
                <span className="font-medium">Personality Insights: </span>
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
                <span className="font-medium">Recommendations: </span>
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
              Conversations: {latestReport.conversationCount} | Total Time: {latestReport.totalConversationTime}
            </div>
          </div>
        </div>
      )}

      {/* 报告历史 */}
      {allReports.length > 1 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Report History</h3>
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
      
      {/* 用户选择器 - 拉窗式，可缩小 */}
      <Drawer isOpen={showUserSelector} onClose={() => setShowUserSelector(false)} title="Select User">
        <div className="p-6 space-y-4">
          {userList.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Existing Users</h3>
              <div className="space-y-2">
                {userList.map((name) => (
                  <div key={name} className="flex items-center justify-between p-2 bg-white rounded border">
                    <span className="text-gray-900">{name}</span>
                    <div className="flex space-x-2">
                      <button onClick={() => switchUser(name)} className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark">Select</button>
                      <button onClick={() => deleteUser(name)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-3">Create New User</h3>
            <div className="flex space-x-2">
              <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Enter user name" className="flex-1 px-3 py-2 border border-primary-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" onKeyPress={(e) => e.key === 'Enter' && addNewUser()} />
              <button onClick={addNewUser} disabled={!newUserName.trim()} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed">Create</button>
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
