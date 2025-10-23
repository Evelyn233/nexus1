import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * 验证手机验证码
 * POST /api/auth/verify-code
 */
export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json()
    
    if (!phone || !code) {
      return NextResponse.json(
        { error: '手机号和验证码不能为空' },
        { status: 400 }
      )
    }
    
    // 查找验证码
    const verificationCode = await prisma.phoneVerificationCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expires: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (!verificationCode) {
      return NextResponse.json(
        { error: '验证码无效或已过期' },
        { status: 400 }
      )
    }
    
    // 标记验证码为已使用
    await prisma.phoneVerificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true }
    })
    
    console.log(`✅ 验证码验证成功: ${phone}`)
    
    return NextResponse.json({
      success: true,
      message: '验证成功'
    })
    
  } catch (error) {
    console.error('验证码验证失败:', error)
    return NextResponse.json(
      { error: '验证失败' },
      { status: 500 }
    )
  }
}








