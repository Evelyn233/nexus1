import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * 发送邮箱验证码（用于邮箱注册）
 * POST /api/auth/send-email-code
 * body: { email: string, type?: 'register' | string }
 */
export async function POST(request: Request) {
  try {
    const { email, type } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 })
    }

    const trimmedEmail = email.trim()
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    // 注册场景下，检查邮箱是否已存在
    if (type === 'register') {
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
        select: { id: true },
      })
      if (existingUser) {
        return NextResponse.json({ error: '该邮箱已被注册' }, { status: 400 })
      }
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[send-email-code] RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: '邮件服务未配置，请联系管理员配置 RESEND_API_KEY' },
        { status: 503 }
      )
    }

    // 生成 6 位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟有效

    await prisma.emailVerificationCode.create({
      data: {
        email: trimmedEmail,
        code,
        type: type || 'register',
        expires: expiresAt,
      },
    })

    const fromDomain = process.env.RESEND_FROM_DOMAIN || 'onboarding@resend.dev'
    const fromName = process.env.RESEND_FROM_NAME || 'Nexus'
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromDomain}>`,
      to: trimmedEmail,
      subject: 'Nexus 注册验证码',
      html: `
        <p>您好，</p>
        <p>您正在使用邮箱 <strong>${trimmedEmail}</strong> 注册 Nexus 账号。</p>
        <p>您的验证码为：</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>有效期 10 分钟，请勿泄露给他人。</p>
        <p>如果这不是您本人的操作，请忽略此邮件。</p>
        <p>— Nexus</p>
      `,
    })

    if (error) {
      console.error('[send-email-code] Resend error:', error)
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: string }).message)
          : String(error)
      return NextResponse.json(
        {
          error: msg || '发送验证码失败',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境方便调试
      dev_code: process.env.NODE_ENV !== 'production' ? code : undefined,
      expires: expiresAt,
    })
  } catch (error) {
    console.error('[send-email-code] failed:', error)
    return NextResponse.json({ error: '发送验证码失败' }, { status: 500 })
  }
}

