import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

/**
 * 重新生成完整的用户元数据
 * 基于用户的基本信息和性格描述
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    if (!user.personality || !user.gender || !user.birthDate) {
      return NextResponse.json(
        { error: '用户基本信息不完整，请先填写完整信息' },
        { status: 400 }
      )
    }

    console.log('🔄 [REGEN-META] 开始重新生成元数据...')
    console.log('📊 [REGEN-META] 用户信息:', {
      name: user.name,
      gender: user.gender,
      personality: user.personality
    })

    // 调用DeepSeek重新分析
    const birthDate = JSON.parse(user.birthDate || '{}')
    const age = new Date().getFullYear() - parseInt(birthDate.year || '1999')
    
    const analysisPrompt = `请对这位用户进行完整的深度分析，生成所有元数据字段。

**用户基本信息：**
- 姓名：${user.name}
- 性别：${user.gender === 'female' ? '女性' : '男性'}
- 年龄：${age}岁
- 身高：${user.height}cm
- 体重：${user.weight}kg
- 所在地：${user.location}
- 性格自我认知：${user.personality}
- 生日：${birthDate.year}年${birthDate.month}月${birthDate.day}日

**任务：生成完整的用户画像元数据**

请分析并返回以下所有字段（不要有空数组）：

{
  "communicationStyle": ["沟通风格特征1", "特征2", "特征3", ...],
  "emotionalPattern": ["情感模式1", "模式2", "模式3", ...],
  "decisionMakingStyle": ["决策风格1", "风格2", "风格3", ...],
  "stressResponse": ["压力应对方式1", "方式2", "方式3", ...],
  "interpersonalStrengths": ["人际优势1", "优势2", "优势3", ...],
  "interpersonalChallenges": ["人际挑战1", "挑战2", ...],
  "socialEnergyPattern": ["社交能量模式1", "模式2", ...],
  "aestheticPreferences": ["美学偏好1", "偏好2", "偏好3", ...],
  "lifestyleHobbies": ["生活爱好1", "爱好2", "爱好3", ...],
  "activityPreferences": ["活动偏好1", "偏好2", "偏好3", ...],
  "fashionStyle": ["时尚风格1", "风格2", "风格3", ...],
  "careerAptitude": ["职业天赋1", "天赋2", "天赋3", ...],
  "relationshipPattern": ["感情模式1", "模式2", "模式3", ...],
  "lifePhilosophy": ["人生哲学1", "哲学2", "哲学3", ...],
  "luckyColors": ["幸运色1", "颜色2", "颜色3"],
  "luckyNumbers": [数字1, 数字2, 数字3],
  "naturalStrengths": ["天然优势1", "优势2", "优势3", ...],
  "personalChallenges": ["个人挑战1", "挑战2", ...],
  "growthPotential": ["成长潜力1", "潜力2", ...]
}

**重要**：
1. 所有数组至少包含3个元素
2. 基于用户的性格描述"${user.personality}"进行深度分析
3. 结合INTJ性格特征
4. 考虑AI创业者的特点
5. 体现内心文艺和硅谷向往

只返回JSON，不要其他解释。`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-e3911ff08dae4f4fb59c7b521e2a5415'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是专业的心理学和性格分析专家。你的任务是基于用户的基本信息和性格描述，生成完整、详细的用户画像元数据。所有字段都必须有内容，不能有空数组。'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API错误: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    // 提取JSON
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                     content.match(/\{[\s\S]*\}/)
    const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
    const metadata = JSON.parse(jsonString)

    console.log('✅ [REGEN-META] 元数据生成完成:', metadata)

    // 直接保存到数据库（不走API，避免权限问题）
    const userMetadata = await prisma.userMetadata.findUnique({
      where: { userId: user.id }
    })

    if (userMetadata) {
      // 更新现有元数据
      await prisma.userMetadata.update({
        where: { userId: user.id },
        data: {
          communicationStyle: JSON.stringify(metadata.communicationStyle || []),
          emotionalPattern: JSON.stringify(metadata.emotionalPattern || []),
          decisionStyle: JSON.stringify(metadata.decisionStyle || []),
          stressResponse: JSON.stringify(metadata.stressResponse || []),
          interpersonalStrengths: JSON.stringify(metadata.interpersonalStrengths || []),
          interpersonalChallenges: JSON.stringify(metadata.interpersonalChallenges || []),
          socialEnergyPattern: JSON.stringify(metadata.socialEnergyPattern || []),
          aestheticPreferences: JSON.stringify(metadata.aestheticPreferences || []),
          lifestyleHobbies: JSON.stringify(metadata.lifestyleHobbies || []),
          activityPreferences: JSON.stringify(metadata.activityPreferences || []),
          fashionStyle: JSON.stringify(metadata.fashionStyle || []),
          careerAptitude: JSON.stringify(metadata.careerAptitude || []),
          relationshipPattern: JSON.stringify(metadata.relationshipPattern || []),
          lifePhilosophy: JSON.stringify(metadata.lifePhilosophy || []),
          luckyColors: JSON.stringify(metadata.luckyColors || []),
          luckyNumbers: JSON.stringify(metadata.luckyNumbers || []),
          coreTraits: JSON.stringify(metadata.coreTraits || []),
          lastAnalyzed: new Date().toISOString()
        }
      })
    }

    console.log('✅ [REGEN-META] 元数据已保存到Prisma')

    return NextResponse.json({
      success: true,
      message: '元数据已重新生成',
      metadata
    })
    
  } catch (error) {
    console.error('❌ [REGEN-META] 重新生成失败:', error)
    return NextResponse.json(
      { error: '重新生成失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

