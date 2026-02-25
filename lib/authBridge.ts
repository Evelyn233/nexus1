/**
 * NextAuth + Prisma用户系统桥接服务
 * 
 * 功能：
 * 1. 登录后自动从Prisma加载用户数据
 * 2. 所有数据存储在Prisma，不使用localStorage
 */

import { Session } from 'next-auth'
import prisma, { withRetry } from './prisma'

/**
 * 登录后检查用户数据
 * 在用户登录成功后调用此函数
 */
export async function initializeUserSession(session: Session | null) {
  if (!session?.user?.email) {
    console.warn('⚠️ [AUTH-BRIDGE] 没有session或用户信息')
    return null
  }
  const email = session.user.email

  try {
    // 从Prisma获取完整用户信息（包括元数据）；P2024 连接池超时时重试一次
    const dbUser = await withRetry(() =>
      prisma.user.findUnique({
        where: { email },
        include: { metadata: true }
      }),
      1
    )

    if (!dbUser) {
      console.error('❌ [AUTH-BRIDGE] Prisma数据库中未找到用户')
      return null
    }

    const userName = dbUser.name || session.user.name || email.split('@')[0]
    
    // 检查birthDate是否为有效的JSON格式
    let hasValidBirthDate = false
    if (dbUser.birthDate) {
      try {
        const birthData = JSON.parse(dbUser.birthDate)
        hasValidBirthDate = !!(birthData.year && birthData.month && birthData.day)
      } catch (e) {
        hasValidBirthDate = false
      }
    }

    // 视为「已填写详细信息」：要么填过旧版表单（gender+birthDate），要么已生成过 Profile（profileData 有内容）
    let hasProfileContent = false
    if (dbUser.profileData) {
      try {
        const pd = typeof dbUser.profileData === 'string' ? JSON.parse(dbUser.profileData) : dbUser.profileData
        hasProfileContent = !!(pd?.userSay || pd?.oneSentenceDesc || (Array.isArray(pd?.insights) && pd.insights.length > 0) || (Array.isArray(pd?.tags) && pd.tags.length > 0))
      } catch {
        hasProfileContent = false
      }
    }
    const hasDetailedInfo = !!(dbUser.gender && hasValidBirthDate) || hasProfileContent

    console.log('✅ [AUTH-BRIDGE] 用户session已验证:', userName)
    console.log('📊 [AUTH-BRIDGE] 用户数据状态:', {
      hasBasicInfo: !!(dbUser.gender && dbUser.birthDate),
      hasMetadata: !!dbUser.metadata,
      hasProfileContent,
      hasDetailedInfo
    })

    return {
      userId: dbUser.id,
      userName: userName,
      hasDetailedInfo,
      hasMetadata: !!dbUser.metadata
    }
  } catch (error) {
    console.error('❌ [AUTH-BRIDGE] 初始化用户session失败:', error)
    return null
  }
}

/**
 * 检查用户是否已填写详细信息
 */
export async function checkUserDetailedInfo(session: Session | null): Promise<boolean> {
  if (!session?.user?.email) {
    return false
  }
  const email = session.user.email

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email }
    })

    return !!(dbUser && dbUser.gender && dbUser.birthDate)
  } catch (error) {
    console.error('❌ [AUTH-BRIDGE] 检查用户详细信息失败:', error)
    return false
  }
}

