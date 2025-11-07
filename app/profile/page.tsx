'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Image as ImageIcon, 
  FileText,
  Settings,
  LogOut,
  Edit,
  BarChart3,
  Clock,
  Sparkles,
  Search,
  X
} from 'lucide-react'

interface UserStats {
  totalImages: number
  totalContents: number
  draftContents: number      // 已创作（草稿）
  privateContents: number    // 锁着的（私密）
  publishedContents: number  // 已发布（公开）
  joinDate: string
  lastActive: string
}

interface WalletData {
  balance: number
  totalSpent: number
  totalEarned: number
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'all' // 🔥 获取筛选标签
  const { isAuthenticated, session, isLoading } = useAuth()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [userMetadata, setUserMetadata] = useState<any>(null)
  const [userStats, setUserStats] = useState<UserStats>({
    totalImages: 0,
    totalContents: 0,
    draftContents: 0,
    privateContents: 0,
    publishedContents: 0,
    joinDate: '',
    lastActive: ''
  })
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [recentContents, setRecentContents] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [walletData, setWalletData] = useState<WalletData | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData()
    }
  }, [isAuthenticated, activeTab]) // 🔥 监听activeTab变化，重新加载数据

  const loadUserData = async () => {
    try {
      setIsLoadingData(true)
      
      // 加载用户基本信息
      let infoData: any = null // 🔥 提升到函数作用域
      const infoResponse = await fetch('/api/user/info')
      if (infoResponse.ok) {
        infoData = await infoResponse.json()
        setUserInfo(infoData.userInfo)
        setUserMetadata(infoData.userMetadata)
      }

      // 加载钱包信息
      const walletResponse = await fetch('/api/user/wallet')
      if (walletResponse.ok) {
        const walletData = await walletResponse.json()
        console.log('💰 [PROFILE] 钱包数据:', walletData)
        if (walletData.success) {
          setWalletData(walletData.wallet)
        }
      }

      // 🔥 如果有tab参数，加载所有内容用于筛选；否则只加载最近5条
      const limit = activeTab !== 'all' ? 1000 : 5
      const recentResponse = await fetch(`/api/user/generated-content?limit=${limit}&offset=0`)
      if (recentResponse.ok) {
        const recentData = await recentResponse.json()
        if (recentData.success) {
          setRecentContents(recentData.contents || [])
        }
      }

      // 加载所有内容用于统计（不限制数量）
      const allContentsResponse = await fetch('/api/user/generated-content?limit=1000&offset=0')
      if (allContentsResponse.ok) {
        const allContentsData = await allContentsResponse.json()
        if (allContentsData.success) {
          const allContents = allContentsData.contents || []
          
          // 计算统计数据
          const totalImages = allContents.reduce((sum: number, content: any) => 
            sum + (content.imageCount || 0), 0
          ) || 0
          
          // 统计不同状态的内容
          const completedCount = allContents.filter((c: any) => c.status === 'completed').length // 已创作（完成但未发布）
          const draftCount = allContents.filter((c: any) => c.status === 'draft').length // 草稿
          const privateCount = allContents.filter((c: any) => c.status === 'private').length // 私密
          const publishedCount = allContents.filter((c: any) => c.status === 'published').length // 已发布（只统计published）
          
          setUserStats({
            totalImages: totalImages,
            totalContents: allContentsData.total || 0,
            draftContents: completedCount, // 🔥 "已创作" = completed状态
            privateContents: privateCount,
            publishedContents: publishedCount, // 🔥 只统计published
            joinDate: infoData.userInfo?.createdAt || '',
            lastActive: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('❌ [PROFILE] 加载用户数据失败:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      await signOut({ callbackUrl: '/auth/signin' })
    }
  }

  // 根据tab和搜索词过滤内容
  const filteredContents = recentContents.filter(content => {
    // 🔥 先根据tab筛选状态
    if (activeTab === 'completed') {
      if (content.status !== 'completed') return false
    } else if (activeTab === 'private') {
      if (content.status !== 'private') return false
    } else if (activeTab === 'published') {
      if (content.status !== 'published') return false
    }
    // activeTab === 'all' 时显示所有
    
    // 再根据搜索词筛选
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      content.initialPrompt?.toLowerCase().includes(query) ||
      content.storyNarrative?.toLowerCase().includes(query) ||
      content.title?.toLowerCase().includes(query)
    )
  })
  
  // 获取当前tab的标题
  const getTabTitle = () => {
    switch (activeTab) {
      case 'completed': return '已创作'
      case 'private': return '🔒 私密内容'
      case 'published': return '已发布'
      default: return '最近创作'
    }
  }

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-magazine-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">请先登录</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-6 py-2 bg-magazine-primary text-white rounded-lg hover:bg-magazine-secondary"
          >
            去登录
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/inflow-logo.jpeg" 
              alt="logo" 
              className="w-16 h-12 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/home')}
            />
            <button
              onClick={() => router.push('/home')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回主页</span>
            </button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">我的主页</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>退出</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - User Info */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* 用户头像和基本信息 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-gradient-to-br from-magazine-primary to-magazine-secondary rounded-full flex items-center justify-center text-white text-4xl font-bold">
                  {session?.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <h2 className="mt-4 text-2xl font-bold text-gray-900">
                  {session?.user?.name || '未设置姓名'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {session?.user?.email}
                </p>
                <button
                  onClick={() => router.push('/user-info')}
                  className="mt-4 px-4 py-2 bg-magazine-primary text-white rounded-lg hover:bg-magazine-secondary transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  编辑资料
                </button>
              </div>

              {/* 用户详细信息 */}
              {userInfo && (
                <div className="mt-6 space-y-3 border-t pt-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">性别：</span>
                    <span className="text-gray-900">{userInfo.gender === 'male' ? '男' : userInfo.gender === 'female' ? '女' : '未设置'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">生日：</span>
                    <span className="text-gray-900">
                      {userInfo.birthDate ? (() => {
                        try {
                          const birth = JSON.parse(userInfo.birthDate)
                          return `${birth.year}年${birth.month}月${birth.day}日`
                        } catch {
                          return '未设置'
                        }
                      })() : '未设置'}
                    </span>
                  </div>
                  {userInfo.height && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600">身高：</span>
                      <span className="text-gray-900">{userInfo.height}cm</span>
                    </div>
                  )}
                  {userInfo.hairLength && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600">发型：</span>
                      <span className="text-gray-900">{userInfo.hairLength}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 钱包卡片 */}
            {walletData && (
              <div className="bg-gradient-to-br from-magazine-primary to-magazine-secondary rounded-xl shadow-sm p-6 text-white">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  我的钱包
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm opacity-90">账户余额</span>
                    <span className="text-2xl font-bold">${walletData.balance.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="opacity-75">总充值</p>
                      <p className="text-lg font-semibold">${walletData.totalEarned.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="opacity-75">总消费</p>
                      <p className="text-lg font-semibold">${walletData.totalSpent.toFixed(2)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/wallet')}
                    className="w-full mt-3 px-4 py-2 bg-white text-magazine-primary rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    充值 / 查看详情
                  </button>
                </div>
              </div>
            )}

            {/* 统计卡片 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-magazine-primary" />
                创作统计
              </h3>
              <div className="space-y-4">
                {/* 生成图片 - 可点击 */}
                <div 
                  onClick={() => router.push('/profile?tab=all')}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ImageIcon className="w-4 h-4" />
                    生成图片
                  </div>
                  <div className="text-2xl font-bold text-magazine-primary">
                    {userStats.totalImages}
                  </div>
                </div>
                
                {/* 总创作次数 - 可点击 */}
                <div 
                  onClick={() => router.push('/profile?tab=all')}
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="w-4 h-4" />
                    创作次数
                  </div>
                  <div className="text-2xl font-bold text-magazine-secondary">
                    {userStats.totalContents}
                  </div>
                </div>
                
                {/* 状态统计 - 分隔线 */}
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  {/* 已创作（completed） - 可点击 */}
                  <div 
                    onClick={() => router.push('/profile?tab=completed')}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      已创作
                    </div>
                    <div className="text-lg font-semibold text-yellow-600">
                      {userStats.draftContents}
                    </div>
                  </div>
                  
                  {/* 锁着的（私密） - 可点击 */}
                  <div 
                    onClick={() => router.push('/profile?tab=private')}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                      🔒 锁着的
                    </div>
                    <div className="text-lg font-semibold text-gray-600">
                      {userStats.privateContents}
                    </div>
                  </div>
                  
                  {/* 已发布（公开） - 可点击 */}
                  <div 
                    onClick={() => router.push('/profile?tab=published')}
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      已发布
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      {userStats.publishedContents}
                    </div>
                  </div>
                </div>
                
                {/* 加入时间 */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      加入时间
                    </div>
                    <div className="text-sm text-gray-900">
                      {userStats.joinDate ? new Date(userStats.joinDate).toLocaleDateString('zh-CN') : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" />
                快捷操作
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/user-info')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>完善个人资料</span>
                  <span className="text-gray-400">→</span>
                </button>
                <button
                  onClick={() => router.push('/home')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>开始创作</span>
                  <span className="text-gray-400">→</span>
                </button>
                <button
                  onClick={() => router.push('/gallery')}
                  className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                >
                  <span>浏览图库</span>
                  <span className="text-gray-400">→</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 已发布作品 */}
            {userStats.publishedContents > 0 && (
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl shadow-sm p-6 border border-teal-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">🌟</span>
                    已发布作品
                    <span className="text-sm font-normal text-magazine-primary">({userStats.publishedContents})</span>
                  </h3>
                  <button
                    onClick={() => router.push('/home')}
                    className="text-sm text-magazine-primary hover:text-magazine-secondary font-medium"
                  >
                    在社区查看 →
                  </button>
                </div>
                
                <div className="bg-white/80 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {filteredContents
                      .filter((content: any) => content.status === 'published')
                      .slice(0, 4)
                      .map((content: any) => {
                        // 解析images字段，并按sceneIndex排序
                        let images = []
                        try {
                          images = typeof content.images === 'string' ? JSON.parse(content.images) : content.images
                          // 按sceneIndex排序，取第一张
                          if (Array.isArray(images) && images.length > 0) {
                            images = images.sort((a, b) => (a.sceneIndex || 0) - (b.sceneIndex || 0))
                          }
                        } catch (e) {
                          console.error('解析images失败:', e)
                        }
                        const firstImage = images && images.length > 0 ? images[0] : null
                        return (
                          <div
                            key={content.id}
                            onClick={() => router.push(`/history/${content.id}`)}
                            className="group cursor-pointer relative aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:border-teal-400 transition-all hover:shadow-lg"
                          >
                            {firstImage?.imageUrl && (
                              <img
                                src={firstImage.imageUrl}
                                alt={content.initialPrompt}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                            <div className="absolute top-2 right-2">
                              <span className="bg-magazine-primary text-white text-xs px-2 py-1 rounded-full font-medium">
                                ✓ 已发布
                              </span>
                            </div>
                            <div className="absolute bottom-2 left-2 right-2">
                              <p className="text-white text-xs font-medium line-clamp-2">
                                {content.initialPrompt || '无标题'}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                  
                  {filteredContents.filter((c: any) => c.status === 'published').length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">还没有发布任何作品</p>
                      <button
                        onClick={() => router.push('/home')}
                        className="mt-3 text-sm text-magazine-primary hover:text-magazine-secondary"
                      >
                        去创作 →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 最近创作 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-magazine-primary" />
                  {getTabTitle()}
                  {activeTab !== 'all' && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({filteredContents.length})
                    </span>
                  )}
                </h3>
                {activeTab !== 'all' && (
                  <button
                    onClick={() => router.push('/profile')}
                    className="text-sm text-magazine-primary hover:text-magazine-secondary"
                  >
                    返回全部 →
                  </button>
                )}
                {activeTab === 'all' && (
                  <button
                    onClick={() => router.push('/home?openHistory=true')}
                    className="text-sm text-magazine-primary hover:text-magazine-secondary"
                  >
                    查看全部 →
                  </button>
                )}
              </div>

              {/* 搜索框 */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索你的创作..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-magazine-primary focus:border-transparent"
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

              {filteredContents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{searchQuery ? '未找到匹配的创作' : '还没有创作记录'}</p>
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-4 px-6 py-2 text-magazine-primary hover:text-magazine-secondary"
                    >
                      清除搜索
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push('/home')}
                      className="mt-4 px-6 py-2 bg-magazine-primary text-white rounded-lg hover:bg-magazine-secondary"
                    >
                      开始创作
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredContents.map((content) => (
                    <div
                      key={content.id}
                      onClick={() => router.push(`/history/${content.id}`)}
                      className="group p-4 border border-gray-200 rounded-lg hover:border-magazine-primary hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-magazine-primary transition-colors line-clamp-1">
                            {content.title || content.initialPrompt || '创作记录'}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {content.storyNarrative || '暂无描述'}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {content.imageCount || 0} 张图片
                            </span>
                            <span>
                              {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                          </div>
                        </div>
                        {content.imageCount > 0 && (
                          <div className="ml-4 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            <div className="w-full h-full flex items-center justify-center text-magazine-primary">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🔒 用户深度画像数据不对外暴露，仅用于后台AI分析和内容优化 */}

          </div>

        </div>
      </div>
    </div>
  )
}

