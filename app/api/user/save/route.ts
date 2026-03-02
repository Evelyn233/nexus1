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

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name || null
    if (body.gender !== undefined) updateData.gender = body.gender || null
    if (body.birthDate !== undefined) updateData.birthDate = body.birthDate ? JSON.stringify(body.birthDate) : null
    if (body.height !== undefined) updateData.height = body.height || null
    if (body.weight !== undefined) updateData.weight = body.weight || null
    if (body.location !== undefined) updateData.location = body.location || null
    if (body.personality !== undefined) updateData.personality = body.personality || null
    if (body.hairLength !== undefined) updateData.hairLength = body.hairLength || null
    if (body.image !== undefined) updateData.image = body.image || null
    if (body.profileSlug !== undefined) updateData.profileSlug = typeof body.profileSlug === 'string' ? (body.profileSlug.trim() || null) : null

    // profileData：与库中已有数据合并，避免局部保存（如只改 tag）时覆盖 qaList、socialLinks 等
    if (body.profileData !== undefined) {
      let merged: Record<string, unknown> = {}
      const current = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { profileData: true }
      })
      if (current?.profileData) {
        try {
          const existing = typeof current.profileData === 'string' ? JSON.parse(current.profileData) : current.profileData
          if (existing && typeof existing === 'object') merged = { ...existing }
        } catch (_) {}
      }
      const incoming = body.profileData && typeof body.profileData === 'object' ? body.profileData : {}
      merged = { ...merged, ...incoming }
      updateData.profileData = JSON.stringify(merged)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true, user: null })
    }

    // 更新用户基本信息到Prisma
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData as any
    })

    console.log('✅ [USER-SAVE] 用户基本信息已保存到Prisma')

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
    
  } catch (error: unknown) {
    console.error('❌ [USER-SAVE] 保存用户基本信息失败:', error)
    const err = error as { code?: string }
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Username already taken', details: 'profileSlug unique' }, { status: 409 })
    }
    return NextResponse.json(
      { error: '保存失败', details: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    )
  }
}























































