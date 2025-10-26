import { NextResponse } from 'next/server'
import { addToWallet } from '@/lib/imageUsageService'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 处理支付回调（手动确认支付）
 */
export async function POST(request: Request) {
  try {
    const { paymentId, amount, userId } = await request.json()

    // 从数据库获取支付记录
    const { prisma } = await import('@/lib/prisma')
    const payment = await prisma.userPayment.findUnique({
      where: { id: paymentId }
    })

    if (!payment) {
      return NextResponse.json(
        { error: '支付记录不存在' },
        { status: 404 }
      )
    }

    if (payment.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: '支付已完成'
      })
    }

    // 更新支付状态
    await prisma.userPayment.update({
      where: { id: paymentId },
      data: {
        status: 'completed'
      }
    })

    // 充值到用户钱包
    await addToWallet(userId, parseFloat(amount))

    console.log('✅ [PAYMENT-CALLBACK] 支付完成:', { paymentId, userId, amount })

    return NextResponse.json({
      success: true,
      message: '支付成功，余额已充值'
    })
    
  } catch (error) {
    console.error('❌ [PAYMENT-CALLBACK] 处理支付回调失败:', error)
    return NextResponse.json(
      { error: '处理支付回调失败' },
      { status: 500 }
    )
  }
}
