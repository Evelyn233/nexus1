import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserImageUsage } from '@/lib/imageUsageService'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 获取用户图片使用情况
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

    // 从数据库获取用户ID
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    const usage = await getUserImageUsage(user.id)
    
    return NextResponse.json(usage)
    
  } catch (error) {
    console.error('❌ [IMAGE-USAGE] 获取用户使用情况失败:', error)
    return NextResponse.json(
      { error: '获取使用情况失败' },
      { status: 500 }
    )
  }
}
