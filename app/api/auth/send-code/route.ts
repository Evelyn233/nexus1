import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * 发送手机验证码
 * POST /api/auth/send-code
 */
export async function POST(request: Request) {
  try {
    const { phone, type } = await request.json()
    
    if (!phone) {
      return NextResponse.json(
        { error: '手机号不能为空' },
        { status: 400 }
      )
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      )
    }
    
    // 如果是注册，检查手机号是否已存在
    if (type === 'register') {
      const existingUser = await prisma.user.findUnique({
        where: { phone }
      })
      
      if (existingUser) {
        return NextResponse.json(
          { error: '该手机号已被注册' },
          { status: 400 }
        )
      }
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // 保存验证码（5分钟有效）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    
    await prisma.phoneVerificationCode.create({
      data: {
        phone,
        code,
        type: type || 'register',
        expires: expiresAt
      }
    })
    
    console.log(`📱 验证码已生成: ${phone} -> ${code}`)
    
    // TODO: 实际发送短信（这里暂时只是模拟）
    // 在实际生产环境中，应该调用短信服务API
    // 例如：阿里云短信、腾讯云短信等
    
    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码（生产环境删除这行）
      dev_code: code,
      expires: expiresAt
    })
    
  } catch (error) {
    console.error('发送验证码失败:', error)
    return NextResponse.json(
      { error: '发送验证码失败' },
      { status: 500 }
    )
  }
}








