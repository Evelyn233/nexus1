import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { name, email, password, code } = await request.json()

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    // 本地/测试环境：若用户输入 000000，则跳过验证码数据库校验（即使 email_verification_codes 表不存在也不报错）
    const isDevSkipCode = process.env.NODE_ENV === 'development' && typeof code === 'string' && code.trim() === '000000'

    if (!isDevSkipCode && (!code || typeof code !== 'string')) {
      return NextResponse.json(
        { error: '请先获取并输入邮箱验证码' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码至少需要6个字符' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      )
    }

    // 验证邮箱验证码（注册场景）
    // - 本地开发时，验证码填 000000 可完全跳过数据库校验
    // - 若数据库尚未创建 email_verification_codes 表（P2021），也直接跳过校验，方便本地测试
    let verificationCode: { id: string } | null = null
    let skipVerification = isDevSkipCode
    if (!skipVerification) {
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
          console.warn('⚠️ email_verification_codes 表不存在，本地/测试环境跳过邮箱验证码校验')
          skipVerification = true
        } else {
          throw err
        }
      }

      if (!skipVerification && !verificationCode) {
        return NextResponse.json(
          { error: '验证码无效或已过期' },
          { status: 400 }
        )
      }
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

    // 标记验证码为已使用（仅在真正做过校验时）
    if (!skipVerification && verificationCode) {
      await prisma.emailVerificationCode.update({
        where: { id: verificationCode.id },
        data: { used: true },
      })
    }

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
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}

