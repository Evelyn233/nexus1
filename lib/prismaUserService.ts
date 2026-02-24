/**
 * Prisma用户数据服务
 * 提供统一的用户数据获取接口
 */

import prisma from './prisma'
import { UserInfo, UserMetadata } from './userInfoService'

/** 从已查出的 user 对象构建 userInfo + userMetadata，避免重复查库 */
export function getPrismaUserInfoFromUser(user: {
  name: string | null
  gender: string | null
  birthDate: string | null
  height: string | null
  weight: string | null
  location: string | null
  personality: string | null
  hairLength: string | null
  metadata?: {
    zodiacSign: string | null
    chineseZodiac: string | null
    baziAnalysis: string | null
    baziDayMaster: string | null
    baziPattern: string | null
    astrologicalProfile: string | null
    ziweiAnalysis: string | null
    coreTraits: string | null
    communicationStyle: string | null
    emotionalPattern: string | null
    decisionStyle: string | null
    careerAptitude: string | null
    relationshipPattern: string | null
    lifePhilosophy: string | null
    interpersonalStrengths: string | null
    interpersonalChallenges: string | null
    socialEnergyPattern: string | null
    aestheticPreferences: string | null
    lifestyleHobbies: string | null
    luckyColors: string | null
    luckyNumbers: string | null
    fashionStyle: string | null
    conversationInsights: string | null
    activityPreferences: string | null
    styleInsights: string | null
    analysisHistory: string | null
    lastAnalyzed: Date
  } | null
}): { userInfo: UserInfo; userMetadata: UserMetadata | null } {
  const userInfo: UserInfo = {
    name: user.name || '',
    gender: (user.gender as 'male' | 'female') || '',
    birthDate: user.birthDate ? JSON.parse(user.birthDate) : { year: '', month: '', day: '', hour: '' },
    height: user.height || '',
    weight: user.weight || '',
    location: user.location || '',
    personality: user.personality || '',
    hairLength: user.hairLength || '',
    age: calculateAge(user.birthDate)
  }
  const userMetadata: UserMetadata | null = user.metadata
    ? {
        zodiacSign: user.metadata.zodiacSign || '',
        chineseZodiac: user.metadata.chineseZodiac || '',
        baziAnalysis: user.metadata.baziAnalysis || '',
        baziDayMaster: user.metadata.baziDayMaster || '',
        baziPattern: user.metadata.baziPattern || '',
        astrologicalProfile: user.metadata.astrologicalProfile || '',
        ziweiAnalysis: user.metadata.ziweiAnalysis || '',
        ziweiPersonality: parseJSON(user.metadata.coreTraits),
        ziweiDestiny: [],
        ziweiCareer: [],
        ziweiRelationship: [],
        baziYinYang: '',
        baziSoulMission: '',
        baziCoreTraits: [],
        baziEnergyType: '',
        baziLifePath: '',
        corePersonalityTraits: parseJSON(user.metadata.coreTraits),
        communicationStyle: parseJSON(user.metadata.communicationStyle),
        emotionalPattern: parseJSON(user.metadata.emotionalPattern),
        decisionMakingStyle: parseJSON(user.metadata.decisionStyle),
        stressResponse: [],
        careerAptitude: parseJSON(user.metadata.careerAptitude),
        relationshipPattern: parseJSON(user.metadata.relationshipPattern),
        lifePhilosophy: parseJSON(user.metadata.lifePhilosophy),
        destinyCharacteristics: [],
        interpersonalStrengths: parseJSON(user.metadata.interpersonalStrengths),
        interpersonalChallenges: parseJSON(user.metadata.interpersonalChallenges),
        communicationTendencies: [],
        socialEnergyPattern: parseJSON(user.metadata.socialEnergyPattern),
        relationshipPreferences: [],
        interpersonalRole: [],
        aestheticPreferences: parseJSON(user.metadata.aestheticPreferences),
        lifestyleHobbies: parseJSON(user.metadata.lifestyleHobbies),
        socialPreferences: [],
        naturalStrengths: [],
        personalChallenges: [],
        growthPotential: [],
        luckyColors: parseJSON(user.metadata.luckyColors),
        luckyNumbers: parseJSON(user.metadata.luckyNumbers),
        compatiblePersonalityTypes: [],
        fashionStyleTendencies: parseJSON(user.metadata.fashionStyle),
        conversationInsights: parseJSON(user.metadata.conversationInsights),
        activityPreferences: parseJSON(user.metadata.activityPreferences),
        styleInsights: parseJSON(user.metadata.styleInsights),
        lastAnalyzed: user.metadata.lastAnalyzed.toISOString(),
        analysisHistory: parseJSON(user.metadata.analysisHistory)
      }
    : null
  return { userInfo, userMetadata }
}

/**
 * 从数据库获取用户完整信息（包括元数据），仅查一次库
 */
export async function getPrismaUserInfo(userEmail: string): Promise<{
  userInfo: UserInfo | null
  userMetadata: UserMetadata | null
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: { metadata: true }
    })
    if (!user) return { userInfo: null, userMetadata: null }
    return getPrismaUserInfoFromUser(user)
  } catch (error: any) {
    if (
      error.code === 'P1001' ||
      error.message?.includes("Can't reach database server") ||
      error.message?.includes('数据库连接失败')
    ) {
      console.warn('⚠️ [PRISMA-USER] 数据库连接失败，返回默认用户信息')
      return {
        userInfo: {
          name: userEmail.split('@')[0] || '用户',
          gender: '',
          birthDate: { year: '1990', month: '1', day: '1', hour: '' },
          height: '170',
          weight: '60',
          location: '未知',
          personality: '待了解',
          hairLength: '中等',
          age: 25
        },
        userMetadata: null
      }
    }
    console.error('❌ 从Prisma获取用户信息失败:', error)
    return { userInfo: null, userMetadata: null }
  }
}

/**
 * 保存用户信息到数据库
 */
export async function savePrismaUserInfo(userEmail: string, userInfo: any): Promise<void> {
  try {
    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (existingUser) {
      // 更新现有用户
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          name: userInfo.name,
          gender: userInfo.gender,
          birthDate: JSON.stringify(userInfo.birthDate),
          age: userInfo.age,
          height: userInfo.height,
          weight: userInfo.weight,
          location: userInfo.location,
          personality: userInfo.personality,
          hairLength: userInfo.hairLength
        }
      })
    } else {
      // 创建新用户
      await prisma.user.create({
        data: {
          email: userEmail,
          name: userInfo.name,
          gender: userInfo.gender,
          birthDate: JSON.stringify(userInfo.birthDate),
          age: userInfo.age,
          height: userInfo.height,
          weight: userInfo.weight,
          location: userInfo.location,
          personality: userInfo.personality,
          hairLength: userInfo.hairLength
        }
      })
    }
    
    console.log('✅ [PRISMA-USER] 用户信息已保存:', userEmail)
  } catch (error) {
    console.error('❌ [PRISMA-USER] 保存用户信息失败:', error)
    throw error
  }
}

/**
 * API端点：获取当前登录用户的完整信息
 */
export async function GET_USER_INFO_API(session: any) {
  if (!session?.user?.email) {
    return null
  }

  return await getPrismaUserInfo(session.user.email)
}

// 辅助函数
function parseJSON(jsonString: string | null): any[] {
  if (!jsonString) return []
  try {
    return JSON.parse(jsonString)
  } catch {
    return []
  }
}

function calculateAge(birthDateStr: string | null): number | undefined {
  if (!birthDateStr) return undefined
  
  try {
    const birthDate = JSON.parse(birthDateStr)
    const year = parseInt(birthDate.year)
    if (!year) return undefined
    
    const currentYear = new Date().getFullYear()
    return currentYear - year
  } catch {
    return undefined
  }
}

