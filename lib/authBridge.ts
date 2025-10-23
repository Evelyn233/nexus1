/**
 * NextAuth + Prisma用户系统桥接服务
 * 
 * 功能：
 * 1. 登录后自动从Prisma加载用户数据
 * 2. 所有数据存储在Prisma，不使用localStorage
 */

import { Session } from 'next-auth'
import prisma from './prisma'

/**
 * 登录后检查用户数据
 * 在用户登录成功后调用此函数
 */
export async function initializeUserSession(session: Session | null) {
  if (!session?.user?.email) {
    console.warn('⚠️ [AUTH-BRIDGE] 没有session或用户信息')
    return null
  }

  try {
    // 从Prisma获取完整用户信息（包括元数据）
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { metadata: true }
    })

    if (!dbUser) {
      console.error('❌ [AUTH-BRIDGE] Prisma数据库中未找到用户')
      return null
    }

    const userName = dbUser.name || session.user.name || session.user.email.split('@')[0]
    
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

    console.log('✅ [AUTH-BRIDGE] 用户session已验证:', userName)
    console.log('📊 [AUTH-BRIDGE] 用户数据状态:', {
      hasBasicInfo: !!(dbUser.gender && dbUser.birthDate),
      hasMetadata: !!dbUser.metadata,
      gender: dbUser.gender,
      birthDate: dbUser.birthDate,
      hasValidBirthDate: hasValidBirthDate
    })

    return {
      userId: dbUser.id,
      userName: userName,
      hasDetailedInfo: !!(dbUser.gender && hasValidBirthDate),
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

  try {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    return !!(dbUser && dbUser.gender && dbUser.birthDate)
  } catch (error) {
    console.error('❌ [AUTH-BRIDGE] 检查用户详细信息失败:', error)
    return false
  }
}

