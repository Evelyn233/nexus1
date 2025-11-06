import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 强制动态渲染（因为使用了 getServerSession，需要 headers）
export const dynamic = 'force-dynamic'

/**
 * 查看所有用户数据（管理员功能）
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 检查数据库连接状态
    try {
      await prisma.$connect()
      console.log('✅ [ADMIN] 数据库连接成功')
    } catch (connectError: any) {
      console.error('❌ [ADMIN] 数据库连接失败:', connectError.message)
      return NextResponse.json({
        success: false,
        error: '数据库连接失败',
        details: connectError.message,
        suggestion: '请检查 DATABASE_URL 环境变量和数据库服务器状态'
      }, { status: 503 })
    }

    // 获取所有用户（添加详细日志）
    console.log('🔍 [ADMIN] 开始获取所有用户数据...')
    const users = await prisma.user.findMany({
      include: {
        metadata: true,
        chatSessions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        generatedContents: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ [ADMIN] 从数据库获取到 ${users.length} 个用户`)
    console.log('📊 [ADMIN] 用户列表:', users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone
    })))

    // 格式化数据，避免循环引用
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      gender: user.gender,
      age: user.age,
      height: user.height,
      weight: user.weight,
      location: user.location,
      personality: user.personality,
      hairLength: user.hairLength,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      metadata: user.metadata ? {
        id: user.metadata.id,
        userId: user.metadata.userId,
        // 核心性格
        coreTraits: user.metadata.coreTraits ? JSON.parse(user.metadata.coreTraits) : null,
        communicationStyle: user.metadata.communicationStyle ? JSON.parse(user.metadata.communicationStyle) : null,
        emotionalPattern: user.metadata.emotionalPattern ? JSON.parse(user.metadata.emotionalPattern) : null,
        decisionStyle: user.metadata.decisionStyle ? JSON.parse(user.metadata.decisionStyle) : null,
        stressResponse: user.metadata.stressResponse ? JSON.parse(user.metadata.stressResponse) : null,
        // 人际关系
        interpersonalStrengths: user.metadata.interpersonalStrengths ? JSON.parse(user.metadata.interpersonalStrengths) : null,
        interpersonalChallenges: user.metadata.interpersonalChallenges ? JSON.parse(user.metadata.interpersonalChallenges) : null,
        socialEnergyPattern: user.metadata.socialEnergyPattern ? JSON.parse(user.metadata.socialEnergyPattern) : null,
        // 生活方式
        aestheticPreferences: user.metadata.aestheticPreferences ? JSON.parse(user.metadata.aestheticPreferences) : null,
        lifestyleHobbies: user.metadata.lifestyleHobbies ? JSON.parse(user.metadata.lifestyleHobbies) : null,
        activityPreferences: user.metadata.activityPreferences ? JSON.parse(user.metadata.activityPreferences) : null,
        fashionStyle: user.metadata.fashionStyle ? JSON.parse(user.metadata.fashionStyle) : null,
        // 地点偏好
        frequentLocations: user.metadata.frequentLocations ? JSON.parse(user.metadata.frequentLocations) : null,
        favoriteVenues: user.metadata.favoriteVenues ? JSON.parse(user.metadata.favoriteVenues) : null,
        // 其他
        conversationInsights: user.metadata.conversationInsights ? JSON.parse(user.metadata.conversationInsights) : null,
        behaviorPatterns: user.metadata.behaviorPatterns ? JSON.parse(user.metadata.behaviorPatterns) : null,
        styleInsights: user.metadata.styleInsights ? JSON.parse(user.metadata.styleInsights) : null,
        userRawInputs: user.metadata.userRawInputs,
        userMentionedKeywords: user.metadata.userMentionedKeywords,
        updateCount: user.metadata.updateCount,
        lastAnalyzed: user.metadata.lastAnalyzed
      } : null,
      chatSessionsCount: user.chatSessions.length,
      generatedContentsCount: user.generatedContents.length
    }))

    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      users: formattedUsers
    })
  } catch (error: any) {
    console.error('❌ [ADMIN] 获取用户数据失败:', error)
    
    // 检查是否是数据库连接错误
    if (error.message?.includes('Can\'t reach database server') || 
        error.message?.includes('P1001') ||
        error.name === 'PrismaClientInitializationError') {
      return NextResponse.json({
        success: false,
        error: '数据库连接失败',
        details: error.message,
        suggestion: '无法连接到数据库服务器。请检查：\n1. DATABASE_URL 是否正确\n2. 数据库服务器是否正常运行\n3. 网络连接是否正常'
      }, { status: 503 })
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: '获取用户数据失败', 
        details: error.message 
      },
      { status: 500 }
    )
  }
}

