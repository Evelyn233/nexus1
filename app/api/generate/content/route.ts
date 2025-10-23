import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaUserInfo } from '@/lib/prismaUserService'
import { ContentGenerationService } from '@/lib/contentGenerationService'

/**
 * 内容生成API - 使用Prisma用户数据
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

    const { initialPrompt, answers } = await request.json()

    if (!initialPrompt) {
      return NextResponse.json(
        { error: '缺少初始提示' },
        { status: 400 }
      )
    }

    // 从数据库获取用户完整信息
    const { userInfo, userMetadata } = await getPrismaUserInfo(session.user.email)

    if (!userInfo) {
      return NextResponse.json(
        { error: '用户信息不存在，请先完成信息填写' },
        { status: 404 }
      )
    }

    console.log('🎯 [API] 内容生成，使用用户数据:', {
      name: userInfo.name,
      age: userInfo.age,
      gender: userInfo.gender,
      location: userInfo.location
    })

    // 生成内容（会使用真实的用户数据）
    const result = await ContentGenerationService.generateQuickContent(
      initialPrompt,
      answers || []
    )

    return NextResponse.json({
      success: true,
      content: result,
      userInfo: {
        age: userInfo.age,
        gender: userInfo.gender,
        location: userInfo.location
      }
    })
    
  } catch (error) {
    console.error('内容生成失败:', error)
    return NextResponse.json(
      { error: '内容生成失败' },
      { status: 500 }
    )
  }
}

