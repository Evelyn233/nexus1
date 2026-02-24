import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaUserInfoFromUser, getPrismaUserInfo, savePrismaUserInfo } from '@/lib/prismaUserService'
import { prisma, withRetry } from '@/lib/prisma'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 获取当前登录用户的完整信息（用于内容生成）
 */
export async function GET() {
  try {
    await prisma.$connect()
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    // 🔥 直接从数据库获取用户（包含ID）
    const user = await withRetry(() => prisma.user.findUnique({
      where: { email: session.user.email },
      include: { metadata: true }
    }))

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 用已查出的 user 直接构建 userInfo/userMetadata，只查一次库
    const { userInfo, userMetadata } = getPrismaUserInfoFromUser(user)

    // 解析 profileData
    let profileData = null
    if (user.profileData) {
      try {
        profileData = JSON.parse(user.profileData)
      } catch {}
    }

    // 当一句话陈述为空时，从用户最早输入中获取（供 profile 页展示）
    let earliestInput: string | null = null
    const hasOneSentence = profileData?.oneSentenceDesc && String(profileData.oneSentenceDesc).trim()
    if (!hasOneSentence) {
      // 1. 最早一条 ChatSession 的 initialPrompt
      const oldestSession = await withRetry(() => prisma.chatSession.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: { initialPrompt: true }
      }))
      if (oldestSession?.initialPrompt?.trim()) {
        earliestInput = oldestSession.initialPrompt.trim()
      }
      // 2. 若无，取 user_metadata.userRawInputs 中最早一条的 answer（数组末位 = 最早）
      if (!earliestInput && user.metadata?.userRawInputs) {
        try {
          const rawInputs = JSON.parse(user.metadata.userRawInputs) as { answer?: string }[]
          if (Array.isArray(rawInputs) && rawInputs.length > 0) {
            const last = rawInputs[rawInputs.length - 1]
            if (last?.answer?.trim()) earliestInput = last.answer.trim()
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      userInfo: { ...userInfo, id: user.id, avatarDataUrl: user.image || null, profileSlug: (user as { profileSlug?: string | null }).profileSlug ?? null },
      userMetadata,
      profileData,
      earliestInput: earliestInput || null,
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

