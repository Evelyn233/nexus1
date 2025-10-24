import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 获取用户元数据
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { metadata: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 如果用户元数据不存在，创建默认元数据
    if (!user.metadata) {
      console.warn('⚠️ [METADATA-API] 用户元数据不存在，创建默认元数据')
      
      const defaultMetadata = {
        zodiacSign: '双鱼座',
        chineseZodiac: '兔',
        coreTraits: JSON.stringify(['理性思维与艺术感知的独特结合', '战略规划能力突出', '独立自主与创新突破精神']),
        communicationStyle: JSON.stringify(['逻辑清晰表达直接', '善于用理性框架解释感性概念', '在专业领域沟通自信流畅']),
        emotionalPattern: JSON.stringify(['内在情感丰富但表达理性', '对失败能快速调整心态', '在压力下保持情绪稳定']),
        behaviorPatterns: JSON.stringify(['基于数据分析与直觉判断结合', '长期战略导向', '风险可控的创新决策']),
        conversationInsights: JSON.stringify(['偏好深度专业对话', '善于用案例说明观点', '在熟悉领域表达自信']),
        frequentLocations: JSON.stringify(['上海', '淞虹路', '虹桥机场附近', '公司办公室', '艺术展览馆']),
        fashionStyle: JSON.stringify(['简约科技风', '理性优雅', '现代国际化']),
        aestheticPreferences: JSON.stringify(['简约科技感与艺术气息结合', '理性秩序中的感性表达', '国际化现代风格'])
      }
      
      const createdMetadata = await prisma.userMetadata.create({
        data: {
          userId: user.id,
          ...defaultMetadata
        }
      })
      
      console.log('✅ [METADATA-API] 已创建默认元数据记录')
      
      // 格式化新创建的元数据
      const metadata = {
        ...createdMetadata,
        coreTraits: JSON.parse(createdMetadata.coreTraits),
        communicationStyle: JSON.parse(createdMetadata.communicationStyle),
        emotionalPattern: JSON.parse(createdMetadata.emotionalPattern),
        behaviorPatterns: JSON.parse(createdMetadata.behaviorPatterns),
        conversationInsights: JSON.parse(createdMetadata.conversationInsights),
        frequentLocations: JSON.parse(createdMetadata.frequentLocations),
        fashionStyle: JSON.parse(createdMetadata.fashionStyle),
        aestheticPreferences: JSON.parse(createdMetadata.aestheticPreferences)
      }
      
      return NextResponse.json({
        success: true,
        metadata
      })
    }

    // 格式化元数据（将所有JSON字符串字段转换为对象/数组）
    const metadata = user.metadata ? {
      ...user.metadata,
      // 核心性格特征
      coreTraits: user.metadata.coreTraits ? JSON.parse(user.metadata.coreTraits) : [],
      communicationStyle: user.metadata.communicationStyle ? JSON.parse(user.metadata.communicationStyle) : [],
      emotionalPattern: user.metadata.emotionalPattern ? JSON.parse(user.metadata.emotionalPattern) : [],
      decisionStyle: user.metadata.decisionStyle ? JSON.parse(user.metadata.decisionStyle) : [],
      stressResponse: user.metadata.stressResponse ? JSON.parse(user.metadata.stressResponse) : [],
      
      // 人际关系特征
      interpersonalStrengths: user.metadata.interpersonalStrengths ? JSON.parse(user.metadata.interpersonalStrengths) : [],
      interpersonalChallenges: user.metadata.interpersonalChallenges ? JSON.parse(user.metadata.interpersonalChallenges) : [],
      socialEnergyPattern: user.metadata.socialEnergyPattern ? JSON.parse(user.metadata.socialEnergyPattern) : [],
      
      // 生活方式和偏好
      aestheticPreferences: user.metadata.aestheticPreferences ? JSON.parse(user.metadata.aestheticPreferences) : [],
      lifestyleHobbies: user.metadata.lifestyleHobbies ? JSON.parse(user.metadata.lifestyleHobbies) : [],
      activityPreferences: user.metadata.activityPreferences ? JSON.parse(user.metadata.activityPreferences) : [],
      fashionStyle: user.metadata.fashionStyle ? JSON.parse(user.metadata.fashionStyle) : [],
      
      // 地点偏好
      frequentLocations: user.metadata.frequentLocations ? JSON.parse(user.metadata.frequentLocations) : [],
      favoriteVenues: user.metadata.favoriteVenues ? JSON.parse(user.metadata.favoriteVenues) : [],
      
      // 职业和关系模式
      careerAptitude: user.metadata.careerAptitude ? JSON.parse(user.metadata.careerAptitude) : [],
      relationshipPattern: user.metadata.relationshipPattern ? JSON.parse(user.metadata.relationshipPattern) : [],
      lifePhilosophy: user.metadata.lifePhilosophy ? JSON.parse(user.metadata.lifePhilosophy) : [],
      
      // 实用特征
      luckyColors: user.metadata.luckyColors ? JSON.parse(user.metadata.luckyColors) : [],
      luckyNumbers: user.metadata.luckyNumbers ? JSON.parse(user.metadata.luckyNumbers) : [],
      
      // 用户真实键入
      userRawInputs: user.metadata.userRawInputs ? JSON.parse(user.metadata.userRawInputs) : [],
      userMentionedKeywords: user.metadata.userMentionedKeywords ? JSON.parse(user.metadata.userMentionedKeywords) : [],
      
      // AI持续学习的洞察
      conversationInsights: user.metadata.conversationInsights ? JSON.parse(user.metadata.conversationInsights) : [],
      behaviorPatterns: user.metadata.behaviorPatterns ? JSON.parse(user.metadata.behaviorPatterns) : [],
      styleInsights: user.metadata.styleInsights ? JSON.parse(user.metadata.styleInsights) : [],
      
      // 分析历史
      analysisHistory: user.metadata.analysisHistory ? JSON.parse(user.metadata.analysisHistory) : []
    } : null

    return NextResponse.json({
      success: true,
      metadata
    })
    
  } catch (error) {
    console.error('获取用户元数据失败:', error)
    return NextResponse.json(
      { error: '获取元数据失败' },
      { status: 500 }
    )
  }
}

/**
 * 更新用户元数据（AI持续更新）
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { updates, source, reasoning } = body  // source: 'conversation' | 'self_cognition' | 'analysis'

    console.log(`🔄 [METADATA] 更新用户元数据，来源: ${source}，字段数: ${Object.keys(updates).length}`)

    // 将数组字段转换为JSON字符串
    const dataToUpdate: any = {}
    
    // Prisma schema中有效的字段列表
    const validFields = new Set([
      'zodiacSign', 'chineseZodiac', 'baziAnalysis', 'baziDayMaster', 'baziPattern',
      'astrologicalProfile', 'ziweiAnalysis', 'deepAstrologicalAnalysis', 'astroAnalysisDate',
      'coreTraits', 'communicationStyle', 'emotionalPattern', 'decisionStyle', 'stressResponse',
      'interpersonalStrengths', 'interpersonalChallenges', 'socialEnergyPattern',
      'aestheticPreferences', 'lifestyleHobbies', 'activityPreferences', 'fashionStyle',
      'frequentLocations', 'favoriteVenues',
      'careerAptitude', 'relationshipPattern', 'lifePhilosophy',
      'luckyColors', 'luckyNumbers',
      'userRawInputs', 'userMentionedKeywords',
      'conversationInsights', 'behaviorPatterns', 'styleInsights',
      'analysisHistory', 'lastAnalyzed', 'updateCount'
    ])
    
    const invalidFields: string[] = []
    
    // 获取现有元数据用于累加
    const existingMeta = await prisma.userMetadata.findUnique({
      where: { userId: user.id }
    })
    
    for (const [key, value] of Object.entries(updates)) {
      // 跳过无效字段
      if (!validFields.has(key)) {
        invalidFields.push(key)
        continue
      }
      
      if (Array.isArray(value)) {
        // 累加逻辑：如果现有数据存在，合并并去重
        if (existingMeta && existingMeta[key as keyof typeof existingMeta]) {
          try {
            const existingArray = JSON.parse(existingMeta[key as keyof typeof existingMeta] as string)
            if (Array.isArray(existingArray)) {
              // 合并数组并去重
              const combined = [...existingArray, ...value]
              const unique = Array.from(new Set(combined))
              dataToUpdate[key] = JSON.stringify(unique)
              console.log(`✅ [METADATA] 累加字段 ${key}: ${existingArray.length} + ${value.length} = ${unique.length}`)
            } else {
              // 如果现有数据不是数组，直接使用新数据
              dataToUpdate[key] = JSON.stringify(value)
            }
          } catch (e) {
            // 如果解析失败，直接使用新数据
            dataToUpdate[key] = JSON.stringify(value)
          }
        } else {
          // 如果没有现有数据，直接使用新数据
          dataToUpdate[key] = JSON.stringify(value)
        }
      } else if (value !== null && value !== undefined) {
        dataToUpdate[key] = value
      }
    }
    
    // 只在有无效字段时打印警告
    if (invalidFields.length > 0) {
      console.warn(`⚠️ [METADATA] 跳过${invalidFields.length}个无效字段:`, invalidFields.join(', '))
    }

    // 记录更新来源
    const updateLog = {
      timestamp: new Date().toISOString(),
      source,
      fields: Object.keys(updates),
      reasoning: reasoning || '无'
    }

    // Upsert元数据（使用前面获取的existingMeta）
    const metadata = await prisma.userMetadata.upsert({
      where: { userId: user.id },
      update: {
        ...dataToUpdate,
        lastAnalyzed: new Date(),
        updateCount: { increment: 1 },
        analysisHistory: existingMeta?.analysisHistory 
          ? JSON.stringify([...JSON.parse(existingMeta.analysisHistory), updateLog])
          : JSON.stringify([updateLog])
      },
      create: {
        userId: user.id,
        ...dataToUpdate,
        analysisHistory: JSON.stringify([updateLog]),
        updateCount: 1
      }
    })

    console.log(`✅ [METADATA] 元数据已更新，更新次数: ${metadata.updateCount}`)

    return NextResponse.json({
      success: true,
      metadata,
      updateCount: metadata.updateCount
    })
    
  } catch (error) {
    // 简化错误输出
    const errorMsg = error instanceof Error ? error.message : '未知错误'
    console.error('❌ [METADATA] 更新失败:', errorMsg)
    
    return NextResponse.json(
      { error: '更新元数据失败', details: errorMsg },
      { status: 500 }
    )
  }
}

