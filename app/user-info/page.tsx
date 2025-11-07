'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { UserInfo, saveUserInfo, getUserInfo, isUserInfoComplete, saveUserMetadata, setCurrentUserName, addUserToList } from '@/lib/userInfoService'
import { UserMetadataAnalyzer } from '@/lib/userMetadataService'
import FirstTimeSetupModal from '@/components/FirstTimeSetupModal'

export default function UserInfoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
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

  // 检查信息是否完整
  const checkComplete = (info: UserInfo) => {
    const baseComplete = !!(
      info.name &&  // 添加姓名必填检查
      info.gender &&
      info.birthDate.year &&
      info.birthDate.month &&
      info.birthDate.day &&
      info.height &&
      info.weight &&
      info.location &&
      info.personality
    )
    
    // 如果是女性，还需要头发长度信息
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
          router.push('/home')
        }
        // 首次用户：等待模态框通过 onClose 回调来触发跳转
      } catch (error) {
        console.error('❌ 元数据分析失败:', error)
        // 即使分析失败也跳转到主页
        if (isFirstTimeUser) {
          setShowFirstTimeModal(false)
        }
        router.push('/home')
      } finally {
        setIsAnalyzing(false)
      }
    }
  }
  
  // 首次设置完成后的回调
  const handleFirstTimeSetupComplete = () => {
    console.log('🎉 [USER-INFO] 首次用户设置完成，跳转到首页')
    setShowFirstTimeModal(false)
    router.push('/home')
  }

  // 跳过
  const handleSkip = () => {
    router.push('/home')
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
              src="/inflow-logo.jpeg" 
              alt="logo" 
              className="w-16 h-16 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/home')}
            />
          </div>
          <h1 className="text-lg font-medium text-gray-900">用户信息</h1>
          <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-white text-xs">?</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 space-y-6">
        
        {/* Name Question */}
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
            <p className="text-gray-700 text-sm">
              您好！很高兴认识您，请问怎么称呼您？
            </p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <div className="w-full max-w-xs">
            <input
              type="text"
              value={userInfo.name}
              onChange={(e) => {
                const newUserInfo = { ...userInfo, name: e.target.value }
                setUserInfo(newUserInfo)
                checkComplete(newUserInfo)
              }}
              placeholder="请输入您的称呼"
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        
        {/* Gender Question */}
        <div className="flex items-start space-x-3">
          <div className="bg-gray-200 rounded-2xl rounded-bl-lg px-4 py-3 max-w-xs">
            <p className="text-gray-700 text-sm">
              {userInfo.name ? `${userInfo.name}，` : ''}请告诉我您的性别？
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => handleGenderChange('male')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
              userInfo.gender === 'male'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            男
          </button>
          <button
            onClick={() => handleGenderChange('female')}
            className={`px-6 py-3 rounded-xl text-sm font-medium transition-colors ${
              userInfo.gender === 'female'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            女
          </button>
        </div>

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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-24"
          />
          <input
            type="number"
            placeholder="体重 kg"
            value={userInfo.weight}
            onChange={(e) => handlePhysicalChange('weight', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-24"
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
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-48"
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
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-48 h-20 resize-none"
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
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                短发
              </button>
              <button
                onClick={() => handlePhysicalChange('hairLength', '中长发')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userInfo.hairLength === '中长发'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                中长发
              </button>
              <button
                onClick={() => handlePhysicalChange('hairLength', '长发')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  userInfo.hairLength === '长发'
                    ? 'bg-purple-600 text-white'
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
            跳过
          </button>
          
          <div className="text-center">
            <p className="text-xs text-gray-400">
              点击完成提交信息
            </p>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!isComplete || isAnalyzing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isComplete && !isAnalyzing
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>{isAnalyzing ? '分析中...' : '完成'}</span>
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
    </div>
  )
}
