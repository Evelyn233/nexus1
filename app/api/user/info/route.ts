import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaUserInfo, savePrismaUserInfo } from '@/lib/prismaUserService'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 获取当前登录用户的完整信息（用于内容生成）
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

    const { userInfo, userMetadata } = await getPrismaUserInfo(session.user.email)

    // 如果用户信息不存在，创建默认用户信息
    if (!userInfo) {
      console.log('🔧 [USER-INFO] 用户信息不存在，创建默认用户信息')
      
      // 创建默认用户信息
      const defaultUserInfo = {
        name: session.user.name || '用户',
        email: session.user.email,
        gender: 'unknown',
        birthDate: { year: '1990', month: '1', day: '1' },
        height: '170',
        weight: '60',
        location: '未知',
        personality: '待了解',
        hairLength: '中等',
        age: 25
      }
      
      // 保存到数据库
      await savePrismaUserInfo(session.user.email, defaultUserInfo)
      
      // 重新获取用户信息
      const { userInfo: newUserInfo, userMetadata: newUserMetadata } = await getPrismaUserInfo(session.user.email)
      
      return NextResponse.json({
        success: true,
        userInfo: newUserInfo,
        userMetadata: newUserMetadata,
        userInfoDescription: generateUserDescription(newUserInfo, newUserMetadata)
      })
    }

    return NextResponse.json({
      success: true,
      userInfo,
      userMetadata,
      userInfoDescription: generateUserDescription(userInfo, userMetadata)
    })
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

// 生成用户描述文本
function generateUserDescription(userInfo: any, userMetadata: any): string {
  let desc = `用户完整档案：\n`
  desc += `- 姓名：${userInfo.name}\n`
  desc += `- 性别：${userInfo.gender === 'female' ? '女性' : '男性'}\n`
  desc += `- 年龄：${userInfo.age}岁\n`
  desc += `- 身高：${userInfo.height}cm\n`
  desc += `- 体重：${userInfo.weight}kg\n`
  desc += `- 所在地：${userInfo.location}\n`
  desc += `- 自我性格认知：${userInfo.personality}\n`
  
  if (userMetadata) {
    desc += `\n命理分析（辅助）：\n`
    desc += `- 星座：${userMetadata.zodiacSign}\n`
    desc += `- 生肖：${userMetadata.chineseZodiac}\n`
    
    if (userMetadata.corePersonalityTraits?.length > 0) {
      desc += `\nAI学习到的特质：\n`
      desc += `- 核心特质：${userMetadata.corePersonalityTraits.join('、')}\n`
    }
  }
  
  return desc
}

