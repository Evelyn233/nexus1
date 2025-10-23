import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

/**
 * 手机号注册
 * POST /api/auth/register-phone
 */
export async function POST(request: Request) {
  try {
    const { name, phone, password, code } = await request.json()
    
    if (!phone || !password || !code) {
      return NextResponse.json(
        { error: '手机号、密码和验证码不能为空' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6个字符' },
        { status: 400 }
      )
    }
    
    // 验证验证码
    const verificationCode = await prisma.phoneVerificationCode.findFirst({
      where: {
        phone,
        code,
        type: 'register',
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
    
    // 检查手机号是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { phone }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已被注册' },
        { status: 400 }
      )
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // 创建用户
    const user = await prisma.user.create({
      data: {
        name: name || `用户${phone.slice(-4)}`,
        phone,
        phoneVerified: true,
        password: hashedPassword,
      }
    })
    
    // 标记验证码为已使用
    await prisma.phoneVerificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true }
    })
    
    console.log('✅ 手机号注册成功:', phone)
    
    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
        }
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('❌ 手机号注册失败:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}








