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
        mbti: user.mbti || '',
        age: user.age || 26
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
        console.error('❌ [USER-API] 服务器端：未找到用户元数据')
        return getDefaultMetadata()
      }
      
      // 解析JSON字段
      const metadata: UserMetadata = {
        zodiacSign: user.metadata.zodiacSign || undefined,
        chineseZodiac: user.metadata.chineseZodiac || undefined,
        corePersonalityTraits: user.metadata.coreTraits ? JSON.parse(user.metadata.coreTraits) : [],
        communicationStyle: user.metadata.communicationStyle ? JSON.parse(user.metadata.communicationStyle) : [],
        emotionalPattern: user.metadata.emotionalPattern ? JSON.parse(user.metadata.emotionalPattern) : [],
        behaviorPatterns: user.metadata.behaviorPatterns ? JSON.parse(user.metadata.behaviorPatterns) : [],
        conversationInsights: user.metadata.conversationInsights ? JSON.parse(user.metadata.conversationInsights) : [],
        frequentLocations: user.metadata.userMentionedLocations ? JSON.parse(user.metadata.userMentionedLocations) : [],
        // ... 添加更多字段
      }
      
      return metadata
    }
    
    // 客户端：使用API
    const response = await fetch('/api/user/metadata')
    
    if (!response.ok) {
      console.error('❌ [USER-API] 获取用户元数据失败:', response.status)
      return getDefaultMetadata()
    }
    
    const data = await response.json()
    return data.metadata || getDefaultMetadata()
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
    zodiacSign: '',
    chineseZodiac: '',
    corePersonalityTraits: [],
    communicationStyle: [],
    emotionalPattern: [],
    decisionMakingStyle: [],
    stressResponse: [],
    careerAptitude: [],
    relationshipPattern: [],
    lifePhilosophy: [],
    destinyCharacteristics: [],
    interpersonalStrengths: [],
    interpersonalChallenges: [],
    communicationTendencies: [],
    socialEnergyPattern: [],
    relationshipPreferences: [],
    interpersonalRole: [],
    aestheticPreferences: [],
    lifestyleHobbies: [],
    socialPreferences: [],
    naturalStrengths: [],
    personalChallenges: [],
    growthPotential: [],
    luckyColors: [],
    luckyNumbers: [],
    compatiblePersonalityTypes: [],
    fashionStyleTendencies: [],
    conversationInsights: [],
    activityPreferences: [],
    styleInsights: [],
    frequentLocations: [],
    favoriteVenues: [],
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

