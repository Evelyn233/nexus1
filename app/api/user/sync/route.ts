import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initializeUserSession } from '@/lib/authBridge'

/**
 * 检查用户数据状态（Prisma）
 * 
 * ⚠️ 注意：此API已弃用localStorage，所有数据从Prisma实时获取
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

    console.log('🔍 [SYNC] 检查Prisma用户数据状态...')
    
    // 验证用户session并检查数据状态
    const result = await initializeUserSession(session)
    
    if (result) {
      console.log('✅ [SYNC] Prisma数据状态检查完成')
      return NextResponse.json({
        success: true,
        message: '数据存储在Prisma中，无需同步',
        result
      })
    } else {
      return NextResponse.json(
        { error: '检查失败' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('❌ [SYNC] 检查失败:', error)
    return NextResponse.json(
      { error: '检查失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}
