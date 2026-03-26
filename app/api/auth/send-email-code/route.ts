import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import prisma from '@/lib/prisma'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Send email verification code (for email registration)
 * POST /api/auth/send-email-code
 * body: { email: string, type?: 'register' | string }
 */
export async function POST(request: Request) {
  try {
    const { email, type } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const trimmedEmail = email.trim()
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // 注册场景下，检查邮箱是否已存在
    if (type === 'register') {
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
        select: { id: true },
      })
      if (existingUser) {
        return NextResponse.json({ error: 'This email is already registered' }, { status: 400 })
      }
    }

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('[send-email-code] RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Please contact the administrator to set RESEND_API_KEY' },
        { status: 503 }
      )
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // valid for 10 minutes

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
      subject: 'Nexus Email Verification Code',
      html: `
        <p>Hi,</p>
        <p>You are using email <strong>${trimmedEmail}</strong> to register a Nexus account.</p>
        <p>Your verification code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>Valid for 10 minutes. Do not share it with anyone.</p>
        <p>If this was not you, please ignore this email.</p>
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
          error: msg || 'Failed to send verification code',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      expires: expiresAt,
    })
  } catch (error) {
    console.error('[send-email-code] failed:', error)
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 })
  }
}

