import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { name, email, password, code } = await request.json()

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Please request and enter the email verification code' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      )
    }

    // 验证邮箱验证码（注册场景）
    let verificationCode: { id: string } | null = null
    try {
      verificationCode = await prisma.emailVerificationCode.findFirst({
        where: {
          email,
          code,
          type: 'register',
          used: false,
          expires: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    } catch (err: any) {
      if (err?.code === 'P2021') {
        return NextResponse.json(
          { error: 'Email verification service not initialized. Please contact the administrator.' },
          { status: 500 }
        )
      }
      throw err
    }

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Verification code is invalid or has expired' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12)

    // 创建用户（schema 默认 userType=person；若从首页「Create Project」走 get-started 会再改为 project）
    const user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        password: hashedPassword,
        emailVerified: new Date(),
      }
    })

    console.log('✅ 用户注册成功:', user.email)

    // 标记验证码为已使用
    await prisma.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ 注册失败:', error)
    return NextResponse.json(
      { error: 'Registration failed, please try again later' },
      { status: 500 }
    )
  }
}

