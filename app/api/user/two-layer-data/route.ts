import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 获取用户的两层数据结构
 * GET /api/user/two-layer-data
 * 
 * 返回：
 * - 第一层：表意识（用户真实说的、做的）
 * - 第二层：潜意识（AI分析的深层模式）
 */
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }
    
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        metadata: true,
        chatSessions: {
          orderBy: { createdAt: 'desc' },
          take: 10  // 最近10条对话
        }
      }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 第一层：表意识（用户真实说的、做的）
    const consciousLayer = {
      description: '第一层：表意识 - 用户真实说的、做的、明确表达的事实（不加推测）',
      categories: {
        '1. 用户自我填写': {
          description: '用户注册时自己填写的基本信息和自我认知',
          data: {
            name: user.name,
            gender: user.gender,
            birthDate: user.birthDate,
            height: user.height,
            weight: user.weight,
            location: user.location,
            personality: user.personality,  // 用户自我描述
            hairLength: user.hairLength,
            selfMBTI: user.selfMBTI,
            selfTraits: user.selfTraits ? JSON.parse(user.selfTraits) : [],
            selfInterests: user.selfInterests ? JSON.parse(user.selfInterests) : [],
            selfGoals: user.selfGoals ? JSON.parse(user.selfGoals) : []
          }
        },
        
        '2. 对话记录': {
          description: '用户每次对话的完整记录（原话）',
          data: user.chatSessions.map(session => ({
            id: session.id,
            date: session.createdAt,
            initialPrompt: session.initialPrompt,
            answers: JSON.parse(session.answers),
            questions: JSON.parse(session.questions)
          }))
        },
        
        '3. 原始输入': {
          description: '用户历史输入记录（逐字逐句）',
          data: user.metadata?.userRawInputs 
            ? JSON.parse(user.metadata.userRawInputs) 
            : []
        },
        
        '4. 提到的关键词': {
          description: '从对话中直接提取的用户说的词汇',
          data: user.metadata?.userMentionedKeywords
            ? JSON.parse(user.metadata.userMentionedKeywords)
            : []
        },
        
        '5. 用户明确提到的地点': {
          description: '用户对话中明确提到的具体地点（如"莱莱小笼"、"悬崖咖啡"）',
          data: user.metadata?.userMentionedLocations
            ? JSON.parse(user.metadata.userMentionedLocations)
            : []
        },
        
        '6. 用户明确提到的活动': {
          description: '用户对话中明确提到的活动',
          data: user.metadata?.userMentionedActivities
            ? JSON.parse(user.metadata.userMentionedActivities)
            : []
        },
        
        '7. 用户明确提到的食物': {
          description: '用户对话中明确提到的食物',
          data: user.metadata?.userMentionedFoods
            ? JSON.parse(user.metadata.userMentionedFoods)
            : []
        }
      },
      totalItems: {
        profileFields: Object.keys({
          name: user.name,
          gender: user.gender,
          personality: user.personality
        }).filter(k => user[k as keyof typeof user]).length,
        conversations: user.chatSessions.length,
        rawInputs: user.metadata?.userRawInputs 
          ? JSON.parse(user.metadata.userRawInputs).length 
          : 0,
        keywords: user.metadata?.userMentionedKeywords
          ? JSON.parse(user.metadata.userMentionedKeywords).length
          : 0,
        mentionedLocations: user.metadata?.userMentionedLocations
          ? JSON.parse(user.metadata.userMentionedLocations).length
          : 0,
        mentionedActivities: user.metadata?.userMentionedActivities
          ? JSON.parse(user.metadata.userMentionedActivities).length
          : 0,
        mentionedFoods: user.metadata?.userMentionedFoods
          ? JSON.parse(user.metadata.userMentionedFoods).length
          : 0
      }
    }
    
    // 第二层：潜意识（AI分析的深层模式）
    const subconsciousLayer = {
      description: '第二层：潜意识 - AI基于第一层分析、推测、学习的深层模式（用于辅助推测）',
      categories: {
        '1. 核心性格特征（AI分析）': {
          description: 'AI基于用户行为和对话分析得出的性格特质',
          data: {
            coreTraits: user.metadata?.coreTraits 
              ? JSON.parse(user.metadata.coreTraits) 
              : [],
            communicationStyle: user.metadata?.communicationStyle
              ? JSON.parse(user.metadata.communicationStyle)
              : [],
            emotionalPattern: user.metadata?.emotionalPattern
              ? JSON.parse(user.metadata.emotionalPattern)
              : [],
            decisionStyle: user.metadata?.decisionStyle
              ? JSON.parse(user.metadata.decisionStyle)
              : [],
            stressResponse: user.metadata?.stressResponse
              ? JSON.parse(user.metadata.stressResponse)
              : []
          }
        },
        
        '2. 人际关系特征（AI分析）': {
          description: 'AI分析的用户人际交往模式',
          data: {
            interpersonalStrengths: user.metadata?.interpersonalStrengths
              ? JSON.parse(user.metadata.interpersonalStrengths)
              : [],
            interpersonalChallenges: user.metadata?.interpersonalChallenges
              ? JSON.parse(user.metadata.interpersonalChallenges)
              : [],
            socialEnergyPattern: user.metadata?.socialEnergyPattern
              ? JSON.parse(user.metadata.socialEnergyPattern)
              : []
          }
        },
        
        '3. 生活方式和偏好（AI学习）': {
          description: 'AI从对话中学习到的用户生活方式',
          data: {
            aestheticPreferences: user.metadata?.aestheticPreferences
              ? JSON.parse(user.metadata.aestheticPreferences)
              : [],
            lifestyleHobbies: user.metadata?.lifestyleHobbies
              ? JSON.parse(user.metadata.lifestyleHobbies)
              : [],
            activityPreferences: user.metadata?.activityPreferences
              ? JSON.parse(user.metadata.activityPreferences)
              : [],
            fashionStyle: user.metadata?.fashionStyle
              ? JSON.parse(user.metadata.fashionStyle)
              : []
          }
        },
        
        '4. 地点偏好（AI推测）⚠️': {
          description: 'AI基于第一层数据推测的常去地点和场所偏好（不是用户原话）',
          note: '⚠️ 这是AI推测，不是用户明确说的地点。用户明确提到的地点在第一层。',
          data: {
            frequentLocations: user.metadata?.frequentLocations
              ? JSON.parse(user.metadata.frequentLocations)
              : [],
            favoriteVenues: user.metadata?.favoriteVenues
              ? JSON.parse(user.metadata.favoriteVenues)
              : []
          }
        },
        
        '5. 职业和关系模式（AI分析）': {
          description: 'AI分析的职业倾向和感情模式',
          data: {
            careerAptitude: user.metadata?.careerAptitude
              ? JSON.parse(user.metadata.careerAptitude)
              : [],
            relationshipPattern: user.metadata?.relationshipPattern
              ? JSON.parse(user.metadata.relationshipPattern)
              : [],
            lifePhilosophy: user.metadata?.lifePhilosophy
              ? JSON.parse(user.metadata.lifePhilosophy)
              : []
          }
        },
        
        '6. AI洞察和模式（AI持续学习）': {
          description: 'AI从对话中持续学习的洞察和模式',
          data: {
            conversationInsights: user.metadata?.conversationInsights
              ? JSON.parse(user.metadata.conversationInsights)
              : [],
            behaviorPatterns: user.metadata?.behaviorPatterns
              ? JSON.parse(user.metadata.behaviorPatterns)
              : [],
            styleInsights: user.metadata?.styleInsights
              ? JSON.parse(user.metadata.styleInsights)
              : []
          }
        },
        
        '7. 命理分析（基于生日计算）': {
          description: '基于用户生日计算的命理信息',
          data: {
            zodiacSign: user.metadata?.zodiacSign,
            chineseZodiac: user.metadata?.chineseZodiac,
            baziAnalysis: user.metadata?.baziAnalysis,
            astrologicalProfile: user.metadata?.astrologicalProfile
          }
        }
      },
      
      // 分析元信息
      analysisInfo: {
        lastAnalyzed: user.metadata?.lastAnalyzed,
        updateCount: user.metadata?.updateCount || 0,
        note: '第二层数据基于第一层分析得出，可追溯到第一层证据'
      }
    }
    
    // 返回两层数据
    return NextResponse.json({
      userId: user.id,
      userName: user.name,
      consciousLayer,    // 第一层：表意识
      subconsciousLayer, // 第二层：潜意识
      summary: {
        layer1_conscious: {
          description: '第一层：用户真实说的、做的（事实）',
          totalConversations: user.chatSessions.length,
          totalRawInputs: consciousLayer.totalItems.rawInputs,
          totalKeywords: consciousLayer.totalItems.keywords,
          totalProfileFields: consciousLayer.totalItems.profileFields
        },
        layer2_subconscious: {
          description: '第二层：AI分析的深层模式（推测）',
          totalCategories: Object.keys(subconsciousLayer.categories).length,
          totalAnalyzedTraits: (() => {
            let total = 0
            Object.values(subconsciousLayer.categories).forEach((category: any) => {
              if (category.data) {
                Object.values(category.data).forEach((value: any) => {
                  if (Array.isArray(value)) {
                    total += value.length
                  }
                })
              }
            })
            return total
          })()
        },
        priorityRule: '优先级：第一层（事实）> 第二层（推测）',
        note: '第二层数据基于第一层分析，可追溯证据'
      }
    })
    
  } catch (error) {
    console.error('获取两层数据失败:', error)
    return NextResponse.json(
      { error: '获取数据失败' },
      { status: 500 }
    )
  }
}

