/**
 * 用户数据API调用层
 * 完全基于Prisma，不使用localStorage
 */

export interface UserInfo {
  name: string
  email?: string
  gender: string
  birthDate: {
    year: string
    month: string
    day: string
    hour?: string
  }
  height: string
  weight: string
  location: string
  personality: string
  hairLength: string
  mbti?: string
  age?: number
}

export interface UserMetadata {
  [key: string]: any
  zodiacSign?: string
  chineseZodiac?: string
  corePersonalityTraits?: string[]
  communicationStyle?: string[]
  emotionalPattern?: string[]
  lifestyleHobbies?: string[]
  activityPreferences?: string[]
  conversationInsights?: string[]
  styleInsights?: string[]
  frequentLocations?: string[]
  favoriteVenues?: string[]
  // ... 更多字段
}

/**
 * 从Prisma获取用户基本信息
 */
export async function getUserInfo(): Promise<UserInfo | null> {
  try {
    // 检测环境：服务器端直接用Prisma，客户端用API
    if (typeof window === 'undefined') {
      // 服务器端：直接使用Prisma
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('./auth')
      const { prisma } = await import('./prisma')
      
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        console.error('❌ [USER-API] 服务器端：未找到session')
        return null
      }
      
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      
      if (!user) {
        console.error('❌ [USER-API] 服务器端：未找到用户')
        return null
      }
      
      return {
        name: user.name || '',
        email: user.email || '',
        gender: user.gender || '',
        birthDate: user.birthDate ? JSON.parse(user.birthDate) : { year: '', month: '', day: '' },
        height: user.height || '',
        weight: user.weight || '',
        location: user.location || '',
        personality: user.personality || '',
        hairLength: user.hairLength || '',
        mbti: (user as any).mbti || '',
        age: (user as any).age || 26
      }
    }
    
    // 客户端：使用API
    const response = await fetch('/api/user/info')
    
    if (!response.ok) {
      console.error('❌ [USER-API] 获取用户信息失败:', response.status)
      return null
    }
    
    const data = await response.json()
    return data.userInfo
  } catch (error) {
    console.error('❌ [USER-API] 获取用户信息失败:', error)
    return null
  }
}

/**
 * 从Prisma获取用户元数据
 */
export async function getUserMetadata(): Promise<UserMetadata> {
  try {
    // 检测环境：服务器端直接用Prisma，客户端用API
    if (typeof window === 'undefined') {
      // 服务器端：直接使用Prisma
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('./auth')
      const { prisma } = await import('./prisma')
      
      const session = await getServerSession(authOptions)
      if (!session?.user?.email) {
        console.error('❌ [USER-API] 服务器端：未找到session')
        return getDefaultMetadata()
      }
      
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { metadata: true }
      })
      
      if (!user || !user.metadata) {
        console.warn('⚠️ [USER-API] 服务器端：未找到用户元数据，创建默认元数据记录')
        
        // 创建默认元数据记录
        const defaultMetadata = getDefaultMetadata()
        const createdMetadata = await prisma.userMetadata.create({
          data: {
            userId: user!.id,
            zodiacSign: defaultMetadata.zodiacSign,
            chineseZodiac: defaultMetadata.chineseZodiac,
            coreTraits: JSON.stringify(defaultMetadata.corePersonalityTraits),
            communicationStyle: JSON.stringify(defaultMetadata.communicationStyle),
            emotionalPattern: JSON.stringify(defaultMetadata.emotionalPattern),
            behaviorPatterns: JSON.stringify(defaultMetadata.behaviorPatterns),
            conversationInsights: JSON.stringify(defaultMetadata.conversationInsights),
            frequentLocations: JSON.stringify(defaultMetadata.subconscious.frequentLocations),
            fashionStyle: JSON.stringify(defaultMetadata.subconscious.fashionStyle),
            aestheticPreferences: JSON.stringify(defaultMetadata.subconscious.aestheticPreferences)
          }
        })
        
        console.log('✅ [USER-API] 已创建默认元数据记录')
        return defaultMetadata
      }
      
      // 解析JSON字段
      console.log('🔍 [USER-API] 数据库原始字段:', {
        frequentLocations: user.metadata.frequentLocations,
        fashionStyle: user.metadata.fashionStyle,
        aestheticPreferences: user.metadata.aestheticPreferences
      })
      
      const metadata: UserMetadata = {
        zodiacSign: user.metadata.zodiacSign || undefined,
        chineseZodiac: user.metadata.chineseZodiac || undefined,
        corePersonalityTraits: user.metadata.coreTraits ? JSON.parse(user.metadata.coreTraits) : [],
        communicationStyle: user.metadata.communicationStyle ? JSON.parse(user.metadata.communicationStyle) : [],
        emotionalPattern: user.metadata.emotionalPattern ? JSON.parse(user.metadata.emotionalPattern) : [],
        behaviorPatterns: user.metadata.behaviorPatterns ? JSON.parse(user.metadata.behaviorPatterns) : [],
        conversationInsights: user.metadata.conversationInsights ? JSON.parse(user.metadata.conversationInsights) : [],
        frequentLocations: user.metadata.frequentLocations ? JSON.parse(user.metadata.frequentLocations) : [],
        // 添加subconscious字段
        subconscious: {
          frequentLocations: user.metadata.frequentLocations ? JSON.parse(user.metadata.frequentLocations) : [],
          fashionStyle: user.metadata.fashionStyle ? JSON.parse(user.metadata.fashionStyle) : [],
          aestheticPreferences: user.metadata.aestheticPreferences ? JSON.parse(user.metadata.aestheticPreferences) : []
        }
      }
      
      console.log('🔍 [USER-API] 解析后的subconscious字段:', metadata.subconscious)
      
      return metadata
    }
    
    // 客户端：使用API
    const response = await fetch('/api/user/metadata')
    
    if (!response.ok) {
      console.error('❌ [USER-API] 获取用户元数据失败:', response.status)
      return getDefaultMetadata()
    }
    
    const data = await response.json()
    if (!data.metadata) {
      console.warn('⚠️ [USER-API] 客户端：未找到用户元数据，返回默认值')
      return getDefaultMetadata()
    }
    
    return data.metadata
  } catch (error) {
    console.error('❌ [USER-API] 获取用户元数据失败:', error)
    return getDefaultMetadata()
  }
}

/**
 * 更新用户元数据到Prisma
 */
export async function updateUserMetadata(
  updates: Partial<UserMetadata>,
  reasoning: string = '对话更新'
): Promise<boolean> {
  try {
    console.log('🔄 [USER-API] 更新用户元数据...', updates)
    
    const response = await fetch('/api/user/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates,
        source: 'conversation_realtime',
        reasoning
      })
    })
    
    if (!response.ok) {
      console.error('❌ [USER-API] 更新元数据失败:', response.status)
      return false
    }
    
    const data = await response.json()
    console.log('✅ [USER-API] 元数据已更新到Prisma')
    return true
  } catch (error) {
    console.error('❌ [USER-API] 更新元数据失败:', error)
    return false
  }
}

/**
 * 获取用户完整描述
 */
export async function getUserDescription(): Promise<string> {
  try {
    const response = await fetch('/api/user/info')
    
    if (!response.ok) {
      return '用户信息加载中...'
    }
    
    const data = await response.json()
    return data.userInfoDescription || '用户信息加载中...'
  } catch (error) {
    console.error('❌ [USER-API] 获取用户描述失败:', error)
    return '用户信息加载中...'
  }
}

/**
 * 更新用户基本信息到Prisma
 */
export async function updateUserInfo(
  updates: Partial<UserInfo>
): Promise<boolean> {
  try {
    console.log('🔄 [USER-API] 更新用户基本信息...', updates)
    
    const response = await fetch('/api/user/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      console.error('❌ [USER-API] 更新基本信息失败:', response.status)
      return false
    }
    
    console.log('✅ [USER-API] 基本信息已更新到Prisma')
    return true
  } catch (error) {
    console.error('❌ [USER-API] 更新基本信息失败:', error)
    return false
  }
}

/**
 * 默认元数据
 */
function getDefaultMetadata(): UserMetadata {
  return {
    zodiacSign: '双鱼座',
    chineseZodiac: '兔',
    corePersonalityTraits: ['理性思维与艺术感知的独特结合', '战略规划能力突出', '独立自主与创新突破精神'],
    communicationStyle: ['逻辑清晰表达直接', '善于用理性框架解释感性概念', '在专业领域沟通自信流畅'],
    emotionalPattern: ['内在情感丰富但表达理性', '对失败能快速调整心态', '在压力下保持情绪稳定'],
    decisionMakingStyle: ['基于数据分析与直觉判断结合', '长期战略导向', '风险可控的创新决策'],
    stressResponse: ['理性分析问题', '寻求解决方案', '保持情绪稳定'],
    careerAptitude: ['人工智能技术理解深刻', '产品思维与用户体验敏感', '国际化团队协作能力'],
    relationshipPattern: ['追求深度精神连接', '理性选择伴侣', '重视独立空间与共同成长'],
    lifePhilosophy: ['用技术创造人文价值', '在理性框架内追求感性表达', '国际化视野与本土实践结合'],
    destinyCharacteristics: ['科技创业与艺术创作双重发展', '理性创新与感性表达并行', '国际化与本土化平衡'],
    interpersonalStrengths: ['与技术人员沟通顺畅', '在跨文化环境中适应良好', '团队领导与协作平衡'],
    interpersonalChallenges: ['对非理性行为容忍度低', '在传统环境中感到束缚', '深度社交能量消耗较大'],
    communicationTendencies: ['偏好深度专业对话', '善于用案例说明观点', '在熟悉领域表达自信'],
    socialEnergyPattern: ['小圈子深度社交偏好', '专业场合社交活跃', '需要独处时间恢复能量'],
    relationshipPreferences: ['智力相当的伴侣关系', '共同成长的发展模式', '理性沟通与感性表达平衡'],
    interpersonalRole: ['团队中的创新引领者', '技术与人文的桥梁', '理性思考的定心丸'],
    aestheticPreferences: ['简约科技感与艺术气息结合', '理性秩序中的感性表达', '国际化现代风格'],
    lifestyleHobbies: ['技术产品体验研究', '艺术展览参观', '国际创业案例学习'],
    socialPreferences: ['技术产品体验研究', '艺术展览参观', '国际创业案例学习'],
    naturalStrengths: ['逻辑思维与直觉判断结合', '跨领域整合能力', '国际化视野与执行力'],
    personalChallenges: ['感性表达需要理性框架', '在传统环境中适应困难', '深度社交能量管理'],
    growthPotential: ['从技术专精到创业领导', '国际化视野与本土实践结合', '理性创新与感性表达平衡'],
    luckyColors: ['科技蓝', '创新绿', '智慧灰'],
    luckyNumbers: ['3', '16', '26'],
    compatiblePersonalityTypes: ['INTJ', 'ENTJ', 'ENFP'],
    fashionStyleTendencies: ['简约科技风', '理性优雅', '现代国际化'],
    conversationInsights: ['偏好深度专业对话', '善于用案例说明观点', '在熟悉领域表达自信'],
    activityPreferences: ['技术产品研发', '创业项目讨论', '艺术科技跨界活动'],
    styleInsights: ['科技感与艺术气息的独特融合', '理性秩序中的个性表达', '国际化现代风格偏好'],
    frequentLocations: ['上海', '淞虹路', '虹桥机场附近', '公司办公室', '艺术展览馆'],
    favoriteVenues: ['科技公司', '艺术展览馆', '创业咖啡厅', '国际会议中心'],
    // 添加subconscious字段
    subconscious: {
      frequentLocations: ['上海', '淞虹路', '虹桥机场附近', '公司办公室', '艺术展览馆'],
      fashionStyle: ['简约科技风', '理性优雅', '现代国际化'],
      aestheticPreferences: ['简约科技感与艺术气息结合', '理性秩序中的感性表达', '国际化现代风格']
    },
    lastAnalyzed: new Date().toISOString(),
    analysisHistory: []
  }
}

/**
 * 客户端缓存（可选，提升性能）
 */
let userInfoCache: { data: UserInfo | null, timestamp: number } | null = null
let userMetadataCache: { data: UserMetadata, timestamp: number } | null = null
const CACHE_TTL = 2 * 60 * 1000 // 2分钟缓存

/**
 * 带缓存的获取用户信息
 */
export async function getUserInfoCached(): Promise<UserInfo | null> {
  const now = Date.now()
  
  // 检查缓存
  if (userInfoCache && (now - userInfoCache.timestamp) < CACHE_TTL) {
    console.log('📦 [USER-API] 使用缓存的用户信息')
    return userInfoCache.data
  }
  
  // 从API获取
  const data = await getUserInfo()
  
  // 更新缓存
  userInfoCache = { data, timestamp: now }
  
  return data
}

/**
 * 带缓存的获取用户元数据
 */
export async function getUserMetadataCached(): Promise<UserMetadata> {
  const now = Date.now()
  
  // 检查缓存
  if (userMetadataCache && (now - userMetadataCache.timestamp) < CACHE_TTL) {
    console.log('📦 [USER-API] 使用缓存的元数据')
    return userMetadataCache.data
  }
  
  // 从API获取
  const data = await getUserMetadata()
  
  // 更新缓存
  userMetadataCache = { data, timestamp: now }
  
  return data
}

/**
 * 清除缓存（在更新数据后调用）
 */
export function clearUserDataCache() {
  userInfoCache = null
  userMetadataCache = null
  console.log('🗑️ [USER-API] 缓存已清除')
}

