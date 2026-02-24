'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { UserInfo, saveUserInfo, getUserInfo, isUserInfoComplete, saveUserMetadata, setCurrentUserName, addUserToList } from '@/lib/userInfoService'
import { UserMetadataAnalyzer } from '@/lib/userMetadataService'
import FirstTimeSetupModal from '@/components/FirstTimeSetupModal'
import ImageCropModal, { blobToDataUrl } from '@/components/ImageCropModal'

export default function UserInfoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  
  // 检查是否是管理员
  const isAdmin = session?.user?.email === '595674464@qq.com'
  const urlPrompt = searchParams.get('prompt') || ''
  
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',  // 添加姓名字段
    gender: '',
    birthDate: {
      year: '',
      month: '',
      day: ''
    },
    height: '',
    weight: '',
    location: '',
    personality: '',
    hairLength: '',
    age: undefined
  })
  
  const [isComplete, setIsComplete] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false)
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0) // 真实分析步骤
  const [profileInput, setProfileInput] = useState(urlPrompt || '') // 用户输入的profile信息
  const [profileFlowImageUrl, setProfileFlowImageUrl] = useState<string | null>(null) // 新账号流程：先放照片，上传后的 URL
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null) // 待裁剪的图片 URL，打开裁剪弹窗
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadUserData = async () => {
      // 如果用户已登录，自动填充邮箱对应的姓名
      if (session?.user?.name && !userInfo.name) {
        setUserInfo(prev => ({ ...prev, name: session.user?.name || '' }))
      }
      
      // 加载已保存的用户信息
      const savedInfo = await getUserInfo()
      if (savedInfo.name) {
        setUserInfo(savedInfo)
      }
      const isInfoComplete = await isUserInfoComplete()
      setIsComplete(isInfoComplete)
      
      // 检测是否是首次用户（没有保存的用户信息或信息不完整）
      // 首次用户: 没有姓名或信息不完整
      const hasExistingCompleteInfo = savedInfo.name && 
                                     savedInfo.gender && 
                                     savedInfo.birthDate?.year && 
                                     isInfoComplete
      setIsFirstTimeUser(!hasExistingCompleteInfo)
      
      console.log('🔍 [USER-INFO] 用户状态检测:', {
        hasName: !!savedInfo.name,
        hasGender: !!savedInfo.gender,
        hasBirthYear: !!savedInfo.birthDate?.year,
        isComplete: isInfoComplete,
        isFirstTimeUser: !hasExistingCompleteInfo,
        sessionUser: session?.user?.name
      })
    }
    
    loadUserData()
  }, [session])

  // 更新性别
  const handleGenderChange = (gender: 'male' | 'female') => {
    const newUserInfo = { ...userInfo, gender }
    setUserInfo(newUserInfo)
    checkComplete(newUserInfo)
  }

  // 更新生日
  const handleBirthDateChange = (field: 'year' | 'month' | 'day', value: string) => {
    const newBirthDate = { ...userInfo.birthDate, [field]: value }
    const newUserInfo = { ...userInfo, birthDate: newBirthDate }
    setUserInfo(newUserInfo)
    checkComplete(newUserInfo)
  }

  // 更新身高体重和其他字段
  const handlePhysicalChange = (field: 'height' | 'weight' | 'location' | 'personality' | 'hairLength', value: string) => {
    const newUserInfo = { ...userInfo, [field]: value }
    setUserInfo(newUserInfo)
    checkComplete(newUserInfo)
  }

  // 检查信息是否完整（姓名、性别已移除问卷，改为可选；其余仍可选填）
  const checkComplete = (info: UserInfo) => {
    const baseComplete = !!(
      info.birthDate.year &&
      info.birthDate.month &&
      info.birthDate.day &&
      info.height &&
      info.weight &&
      info.location &&
      info.personality
    )
    const complete = info.gender === 'female' ? (baseComplete && !!info.hairLength) : baseComplete
    setIsComplete(complete)
  }

  // 提交信息
  const handleSubmit = async () => {
    if (isComplete) {
      // 如果是首次用户，显示等待提示框
      if (isFirstTimeUser) {
        console.log('✨ [USER-INFO] 首次用户，显示等待提示框')
        setShowFirstTimeModal(true)
        setAnalysisStep(0) // 步骤0：开始分析
      } else {
        console.log('🔄 [USER-INFO] 老用户更新信息，不显示提示框')
      }
      
      setIsAnalyzing(true)
      try {
        // 检查是否包含MBTI信息
        const hasMBTI = /(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)/i.test(userInfo.personality)
        console.log('🔍 检测到MBTI信息:', hasMBTI, userInfo.personality)
        
        // 设置为当前用户并添加到用户列表
        console.log('👤 设置当前用户:', userInfo.name)
        setCurrentUserName(userInfo.name)
        addUserToList(userInfo.name)
        
        // 保存基本信息到localStorage
        // Memobase是可选功能，暂时禁用
        saveUserInfo(userInfo)
        
        // 🔍 步骤1：分析用户元数据
        console.log('🔍 开始分析用户元数据...')
        console.log('🎯 用户性格描述:', userInfo.personality)
        
        const metadata = await UserMetadataAnalyzer.analyzeUserMetadata(userInfo)
        console.log('📊 基础分析结果:', metadata)
        
        if (isFirstTimeUser) {
          setAnalysisStep(1) // 步骤1完成：基础分析完成
        }
        
        // 保存元数据到localStorage
        // Memobase是可选功能，暂时禁用
        saveUserMetadata(metadata)
        
        // 🌟 步骤2：进行星盘超深度分析（暂时禁用，太慢了）
        // console.log('🌟 开始星盘超深度分析...')
        // try {
        //   const { performDeepAstrologicalAnalysis } = await import('@/lib/astrologicalDeepAnalysis')
        //   const deepAnalysis = await performDeepAstrologicalAnalysis(userInfo)
        //   console.log('✨ 超深度分析完成:', deepAnalysis)
        //   
        //   if (isFirstTimeUser) {
        //     setAnalysisStep(2) // 步骤2完成：超深度分析完成
        //   }
        //   
        //   // 保存到数据库
        //   if (session?.user?.email) {
        //     await fetch('/api/user/metadata', {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({
        //         updates: {
        //           deepAstrologicalAnalysis: JSON.stringify(deepAnalysis),
        //           astroAnalysisDate: new Date().toISOString()
        //         },
        //         source: 'deep_astrological_analysis',
        //         reasoning: '星盘超深度分析，基于用户自我认知（90%）和星盘背景（10%）'
        //       })
        //     })
        //     console.log('✅ 超深度分析已保存到Prisma')
        //   }
        // } catch (deepError) {
        //   console.error('⚠️ 超深度分析失败（不影响主流程）:', deepError)
        // }
        
        // 💾 步骤2：如果用户已登录，同步到数据库
        if (session?.user?.email) {
          if (isFirstTimeUser) {
            setAnalysisStep(2) // 步骤2：开始保存到数据库
          }
          
          console.log('📤 [USER-INFO] 准备保存用户信息到Prisma...')
          console.log('📊 [USER-INFO] 用户信息:', userInfo)
          console.log('📧 [USER-INFO] 用户邮箱:', session.user.email)
          
          // 保存用户基本信息到Prisma
          const saveResponse = await fetch('/api/user/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userInfo)
          })
          
          if (saveResponse.ok) {
            console.log('✅ [USER-INFO] 用户信息已成功同步到数据库')
          } else {
            console.error('❌ [USER-INFO] 用户信息同步失败')
            alert('⚠️ 数据保存到数据库时出现问题，但localStorage已保存')
          }
          
          // 💾 初始化元数据到Prisma（第一层：自我认知）
          await fetch('/api/user/metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updates: {
                zodiacSign: metadata.zodiacSign,
                chineseZodiac: metadata.chineseZodiac,
                baziAnalysis: metadata.baziAnalysis,
                baziDayMaster: metadata.baziDayMaster,
                baziPattern: metadata.baziPattern,
                coreTraits: metadata.corePersonalityTraits || [],
                selfMBTI: hasMBTI ? userInfo.personality.match(/[A-Z]{4}/)?.[0] : null
              },
              source: 'self_cognition'
            })
          })
          console.log('✅ 基础元数据已保存到数据库')
        }
        
        if (isFirstTimeUser) {
          setAnalysisStep(3) // 步骤3完成：所有数据已保存（触发自动关闭）
        }
        
        console.log('✅ 用户信息和元数据保存完成')
        
        // 如果不是首次用户，立即跳转
        if (!isFirstTimeUser) {
          router.push('/profile')
        }
        // 首次用户：等待模态框通过 onClose 回调来触发跳转
      } catch (error) {
        console.error('❌ 元数据分析失败:', error)
        // 即使分析失败也跳转到主页
        if (isFirstTimeUser) {
          setShowFirstTimeModal(false)
        }
        router.push('/profile')
      } finally {
        setIsAnalyzing(false)
      }
    }
  }
  
  // 首次设置完成后的回调
  const handleFirstTimeSetupComplete = () => {
    console.log('🎉 [USER-INFO] 首次用户设置完成，跳转到首页')
    setShowFirstTimeModal(false)
    router.push('/profile')
  }

  // 跳过
  const handleSkip = () => {
    router.push('/profile')
  }

  // 生成年份选项
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i)

  // 生成月份选项
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // 生成日期选项
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/logo-nexus.jpeg" 
              alt="logo" 
              className="h-10 w-auto object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/profile')}
            />
          </div>
          <h1 className="text-lg font-medium text-gray-900">用户信息</h1>
          {session ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              换账号
            </button>
          ) : (
            <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">?</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        
        {/* Profile Generation Dialog - For Admin（新账号流程：先放照片，再介绍自己） */}
        {isAdmin && (
          <div className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-6 shadow-lg">
            <p className="text-center text-lg font-semibold text-gray-900 mb-4">
              生成你的专属 Profile
            </p>
            <div className="flex flex-col gap-5">
              {/* 第一步：上传一张照片 - input 盖在最上层 + 备用按钮，兼容手机端 */}
              <div>
                <p className="text-sm font-medium text-teal-800 mb-2">第一步：上传一张照片</p>
                <label className="relative flex w-full aspect-[4/3] min-h-[120px] rounded-xl border-2 border-dashed border-teal-300 bg-white/80 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer overflow-hidden">
                  {profileFlowImageUrl ? (
                    <img src={profileFlowImageUrl} alt="已上传" className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-teal-600 pointer-events-none">
                      <span className="text-4xl">📷</span>
                      <span className="text-sm font-medium">点击上传照片</span>
                    </div>
                  )}
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    style={{ fontSize: '16px' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      setCropImageSrc(url)
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="mt-2 w-full py-2 text-sm text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50"
                >
                  或点此选择照片
                </button>
                <p className="mt-1.5 text-xs text-gray-500">
                  若提示「权限被拒」，请在浏览器弹窗中允许访问照片/相册；或在手机设置 → 应用 → Chrome → 权限中开启
                </p>
              </div>
              {/* 第二步：介绍一下自己 */}
              <div>
                <p className="text-sm font-medium text-teal-800 mb-2">第二步：介绍一下自己</p>
                <textarea
                  value={profileInput}
                  onChange={(e) => setProfileInput(e.target.value)}
                  placeholder="例如：我是 Evelyn，做 AI 产品，喜欢艺术电影和独立音乐…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-teal-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey && profileInput.trim()) {
                      router.push(`/chat-new?prompt=${encodeURIComponent(profileInput.trim())}&autoStart=true${profileFlowImageUrl ? `&image=${encodeURIComponent(profileFlowImageUrl)}` : ''}`)
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const prompt = profileInput.trim() || 'Help me create my profile'
                  const url = profileFlowImageUrl
                    ? `/chat-new?prompt=${encodeURIComponent(prompt)}&autoStart=true&image=${encodeURIComponent(profileFlowImageUrl)}`
                    : `/chat-new?prompt=${encodeURIComponent(prompt)}&autoStart=true`
                  router.push(url)
                }}
                className="w-full px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-md"
              >
                {profileFlowImageUrl ? '开始生成 Profile' : '先上传照片，或直接开始对话'}
              </button>
              {urlPrompt && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  来自首页的输入："{urlPrompt.substring(0, 50)}{urlPrompt.length > 50 ? '...' : ''}"
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* 🔥 新账号流程：先放照片，再介绍自己 */}
        {!isAdmin && (
          <div className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-6 shadow-lg">
            <p className="text-center text-lg font-semibold text-gray-900 mb-4">
              生成你的专属 Profile
            </p>
            <div className="flex flex-col gap-5">
              {/* 第一步：上传一张照片 - input 盖在最上层 + 备用按钮，兼容手机端 */}
              <div>
                <p className="text-sm font-medium text-teal-800 mb-2">第一步：上传一张照片</p>
                <label className="relative flex w-full aspect-[4/3] min-h-[120px] rounded-xl border-2 border-dashed border-teal-300 bg-white/80 hover:border-teal-400 hover:bg-teal-50/50 cursor-pointer overflow-hidden">
                  {profileFlowImageUrl ? (
                    <img src={profileFlowImageUrl} alt="已上传" className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-teal-600 pointer-events-none">
                      <span className="text-4xl">📷</span>
                      <span className="text-sm font-medium">点击上传照片</span>
                      <span className="text-xs text-gray-500">选一张你喜欢的照片</span>
                    </div>
                  )}
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    style={{ fontSize: '16px' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      setCropImageSrc(url)
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="mt-2 w-full py-2 text-sm text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50"
                >
                  或点此选择照片
                </button>
                <p className="mt-1.5 text-xs text-gray-500">
                  若提示「权限被拒」，请在浏览器弹窗中允许访问照片/相册；或在手机设置 → 应用 → Chrome → 权限中开启
                </p>
              </div>
              {/* 第二步：介绍一下自己 */}
              <div>
                <p className="text-sm font-medium text-teal-800 mb-2">第二步：介绍一下自己</p>
                <textarea
                  value={profileInput}
                  onChange={(e) => setProfileInput(e.target.value)}
                  placeholder="例如：我是 Evelyn，做 AI 产品，喜欢艺术电影和独立音乐…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-teal-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey && profileInput.trim()) {
                      router.push(`/chat-new?prompt=${encodeURIComponent(profileInput.trim())}&autoStart=true${profileFlowImageUrl ? `&image=${encodeURIComponent(profileFlowImageUrl)}` : ''}`)
                    }
                  }}
                />
              </div>
              <button
                onClick={() => {
                  const prompt = profileInput.trim() || 'Help me create my profile'
                  const url = profileFlowImageUrl
                    ? `/chat-new?prompt=${encodeURIComponent(prompt)}&autoStart=true&image=${encodeURIComponent(profileFlowImageUrl)}`
                    : `/chat-new?prompt=${encodeURIComponent(prompt)}&autoStart=true`
                  router.push(url)
                }}
                className="w-full px-8 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-md"
              >
                {profileFlowImageUrl ? '开始生成 Profile' : '先上传照片，或直接开始对话'}
              </button>
            </div>
          </div>
        )}
        
        {/* Birth Date Question */}
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
            <p className="text-gray-700 text-sm">
              谢谢!接下来请输入您的出生日期:
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <select
            value={userInfo.birthDate.year}
            onChange={(e) => handleBirthDateChange('year', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">年</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <span className="text-gray-500">/</span>
          <select
            value={userInfo.birthDate.month}
            onChange={(e) => handleBirthDateChange('month', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">月</option>
            {months.map(month => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <span className="text-gray-500">/</span>
          <select
            value={userInfo.birthDate.day}
            onChange={(e) => handleBirthDateChange('day', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">日</option>
            {days.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>

        {/* Height and Weight Question */}
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
            <p className="text-gray-700 text-sm">
              请告诉我您的身高和体重:
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <input
            type="number"
            placeholder="身高 cm"
            value={userInfo.height}
            onChange={(e) => handlePhysicalChange('height', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-24"
          />
          <input
            type="number"
            placeholder="体重 kg"
            value={userInfo.weight}
            onChange={(e) => handlePhysicalChange('weight', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-24"
          />
        </div>

        {/* Location Question */}
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
            <p className="text-gray-700 text-sm">
              您目前在哪里生活呢?
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <input
            type="text"
            placeholder="例如：北京、上海、深圳..."
            value={userInfo.location}
            onChange={(e) => handlePhysicalChange('location', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
          />
        </div>

        {/* Personality Question */}
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
            <p className="text-gray-700 text-sm">
              请简单描述一下您的性格特点:
            </p>
            <p className="text-gray-500 text-xs mt-1">
              可以告诉您的MBTI吗？
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <textarea
            placeholder="例如：INFJ、ENFP、开朗外向、安静内敛、喜欢冒险..."
            value={userInfo.personality}
            onChange={(e) => handlePhysicalChange('personality', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 h-20 resize-none"
          />
        </div>

        {/* Hair Length Question - Only for females */}
        {userInfo.gender === 'female' && (
          <>
            <div className="flex items-start space-x-3">
              <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
                <p className="text-gray-700 text-sm">
                  最后，请选择您的头发长度:
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => handlePhysicalChange('hairLength', '短发')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userInfo.hairLength === '短发'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                短发
              </button>
              <button
                onClick={() => handlePhysicalChange('hairLength', '中长发')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userInfo.hairLength === '中长发'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                中长发
              </button>
              <button
                onClick={() => handlePhysicalChange('hairLength', '长发')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userInfo.hairLength === '长发'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                长发
              </button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-gray-500 text-sm hover:text-gray-700"
          >
            Skip
          </button>
          
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Click Complete to submit information
            </p>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!isComplete || isAnalyzing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isComplete && !isAnalyzing
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>{isAnalyzing ? 'Analyzing...' : 'Complete'}</span>
            <span className="text-white">{isAnalyzing ? '🔍' : '✈️'}</span>
          </button>
        </div>
      </div>
      
      {/* 首次录入信息等待提示框 */}
      <FirstTimeSetupModal 
        isOpen={showFirstTimeModal}
        onClose={handleFirstTimeSetupComplete}
        currentStep={analysisStep}
      />

      {/* 上传照片后裁剪：选图 → 裁剪到合适位置 → 确定后上传 */}
      <ImageCropModal
        imageSrc={cropImageSrc ?? ''}
        isOpen={!!cropImageSrc}
        onClose={() => {
          if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
          setCropImageSrc(null)
        }}
        onConfirm={async (blob) => {
          try {
            const dataUrl = await blobToDataUrl(blob)
            const res = await fetch('/api/image/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData: dataUrl, filename: 'profile-crop.jpg' }),
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              alert('上传失败：' + (err.error || res.status))
              return
            }
            const data = await res.json()
            if (data?.url) setProfileFlowImageUrl(data.url)
            if (cropImageSrc) URL.revokeObjectURL(cropImageSrc)
            setCropImageSrc(null)
          } catch (err) {
            console.error('Upload after crop:', err)
            alert('上传失败，请重试')
          }
        }}
        aspect={4 / 3}
        title="裁剪照片"
      />
    </div>
  )
}
