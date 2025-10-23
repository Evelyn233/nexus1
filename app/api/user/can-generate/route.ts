import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canUserGenerateImages } from '@/lib/imageUsageService'

/**
 * 检查用户是否可以生成图片
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

    const result = await canUserGenerateImages(user.id)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ [CAN-GENERATE] 检查生成权限失败:', error)
    return NextResponse.json(
      { error: '检查生成权限失败' },
      { status: 500 }
    )
  }
}
