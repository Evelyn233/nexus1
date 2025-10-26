import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canUserGenerateImages } from '@/lib/imageUsageService'

// 强制动态渲染
export const dynamic = 'force-dynamic'

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

    const result = await canUserGenerateImages(session.user.email)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ [CAN-GENERATE] 检查生成权限失败:', error)
    return NextResponse.json(
      { error: '检查生成权限失败' },
      { status: 500 }
    )
  }
}
