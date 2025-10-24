import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 修复用户数据：从localStorage同步到Prisma
 * POST请求时需要传入localStorage中的用户数据
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

    const body = await request.json()
    const { userInfo } = body
    
    if (!userInfo) {
      return NextResponse.json(
        { error: '缺少用户信息' },
        { status: 400 }
      )
    }

    console.log('🔧 [FIX-DATA] 开始修复用户数据...')
    console.log('📊 [FIX-DATA] 接收到的数据:', userInfo)

    // 更新数据库
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: userInfo.name || session.user.name,
        gender: userInfo.gender || null,
        birthDate: userInfo.birthDate ? JSON.stringify(userInfo.birthDate) : null,
        height: userInfo.height || null,
        weight: userInfo.weight || null,
        location: userInfo.location || null,
        personality: userInfo.personality || null,
        hairLength: userInfo.hairLength || null,
      }
    })

    console.log('✅ [FIX-DATA] 用户数据已修复')
    console.log('📊 [FIX-DATA] 更新后的数据:', updatedUser)

    return NextResponse.json({
      success: true,
      message: '用户数据已修复',
      updatedUser
    })
    
  } catch (error) {
    console.error('❌ [FIX-DATA] 修复失败:', error)
    return NextResponse.json(
      { error: '修复失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}

