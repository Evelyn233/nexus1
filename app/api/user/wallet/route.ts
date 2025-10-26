import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserImageUsage, getUserWalletBalance, getUserDailyQuota } from '@/lib/imageUsageService'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取用户图片使用情况
    const imageUsage = await getUserImageUsage(session.user.email)
    
    // 获取钱包余额
    const walletBalance = await getUserWalletBalance(imageUsage.userId)
    
    // 获取今日免费额度
    const dailyQuota = await getUserDailyQuota(imageUsage.userId)

    return NextResponse.json({
      balance: walletBalance,
      dailyFreeUsed: dailyQuota.freeImagesUsed,
      dailyFreeLimit: dailyQuota.freeImagesLimit,
      isNewUser: dailyQuota.isNewUser,
      totalSpent: 0, // 这里可以从数据库获取
      totalEarned: 0, // 这里可以从数据库获取
    })

  } catch (error) {
    console.error('获取钱包信息失败:', error)
    return NextResponse.json(
      { error: '获取钱包信息失败' },
      { status: 500 }
    )
  }
}
