import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
    const email = session.user.email

    // 直接从数据库获取用户（不含 metadata 层，仅 profileData）
    const user = await withRetry(() => prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, image: true, profileSlug: true, profileData: true }
    }))

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 解析 profileData
    let profileData = null
    if (user.profileData) {
      try {
        profileData = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
      } catch {}
    }

    const userInfo = {
      id: user.id,
      name: user.name,
      avatarDataUrl: user.image || null,
      profileSlug: (user as { profileSlug?: string | null }).profileSlug ?? null,
      userType: (user as { userType?: string }).userType ?? profileData?.userType ?? 'person'
    }

    return NextResponse.json({
      success: true,
      userInfo,
      profileData,
      earliestInput: null
    })
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}

