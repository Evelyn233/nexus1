import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 创建PayPal支付链接
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

    const { amount, images, description } = await request.json()

    // 从数据库获取用户ID
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 创建PayPal支付链接
    const paypalUrl = `https://www.paypal.me/lumina134/${amount}?locale.x=en_AU`
    
    // 在数据库中创建待支付记录
    const payment = await prisma.userPayment.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        paymentId: `pending_${Date.now()}`,
        status: 'pending',
        imagesPurchased: images,
        paypalUrl: paypalUrl
      }
    })

    console.log('✅ [PAYMENT] 创建支付链接:', { userId: user.id, amount, paymentId: payment.id })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      paymentUrl: paypalUrl,
      amount: amount,
      images: images
    })
    
  } catch (error) {
    console.error('❌ [PAYMENT] 创建支付失败:', error)
    return NextResponse.json(
      { error: '创建支付失败' },
      { status: 500 }
    )
  }
}
