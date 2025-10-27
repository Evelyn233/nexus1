/**
 * Prisma用户数据服务
 * 提供统一的用户数据获取接口
 */

import prisma from './prisma'
import { UserInfo, UserMetadata } from './userInfoService'

/**
 * 从数据库获取用户完整信息（包括元数据）
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

    if (!user) {
      return { userInfo: null, userMetadata: null }
    }

    // 转换为UserInfo格式
    const userInfo: UserInfo = {
      name: user.name || '',
      gender: (user.gender as 'male' | 'female') || '',
      birthDate: user.birthDate ? JSON.parse(user.birthDate) : {
        year: '',
        month: '',
        day: '',
        hour: ''
      },
      height: user.height || '',
      weight: user.weight || '',
      location: user.location || '',
      personality: user.personality || '',
      hairLength: user.hairLength || '',
      age: calculateAge(user.birthDate)
    }

    // 转换元数据
    const userMetadata: UserMetadata | null = user.metadata ? {
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
    } : null

    return { userInfo, userMetadata }
  } catch (error) {
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
          height: userInfo.height,
          weight: userInfo.weight,
          location: userInfo.location,
          personality: userInfo.personality,
          hairLength: userInfo.hairLength,
          age: userInfo.age
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
          height: userInfo.height,
          weight: userInfo.weight,
          location: userInfo.location,
          personality: userInfo.personality,
          hairLength: userInfo.hairLength,
          age: userInfo.age
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

