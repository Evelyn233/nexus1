import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 保存/更新用户基本信息到Prisma
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
    console.log('💾 [USER-SAVE] 保存用户基本信息:', body)

    // 更新用户基本信息到Prisma
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: body.name || null,
        gender: body.gender || null,
        birthDate: body.birthDate ? JSON.stringify(body.birthDate) : null,
        height: body.height || null,
        weight: body.weight || null,
        location: body.location || null,
        personality: body.personality || null,
        hairLength: body.hairLength || null,
      }
    })

    console.log('✅ [USER-SAVE] 用户基本信息已保存到Prisma')

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
    
  } catch (error) {
    console.error('❌ [USER-SAVE] 保存用户基本信息失败:', error)
    return NextResponse.json(
      { 
        error: '保存失败', 
        details: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    )
  }
}








































