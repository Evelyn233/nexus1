/**
 * 图片使用量管理服务
 * 跟踪用户已生成的图片数量，实现付费限制
 */

import prisma from './prisma'

export interface ImageUsageData {
  userId: string
  totalImagesGenerated: number
  freeImagesUsed: number
  paidImagesUsed: number
  lastPaymentDate?: Date
  isPremiumUser: boolean
}

/**
 * 获取用户图片使用情况
 */
export async function getUserImageUsage(userId: string): Promise<ImageUsageData> {
  try {
    // 从数据库获取用户已生成的内容
    const userContent = await prisma.userGeneratedContent.findMany({
      where: { userId },
      select: { 
        images: true,
        createdAt: true
      }
    })

    // 计算总图片数量
    const totalImages = userContent.reduce((sum, content) => {
      return sum + (content.images ? JSON.parse(content.images).length : 0)
    }, 0)

    // 检查是否有付费记录
    const paymentRecord = await prisma.userPayment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    const isPremiumUser = !!paymentRecord
    const freeImagesUsed = Math.min(totalImages, 12) // 前12张免费
    const paidImagesUsed = Math.max(0, totalImages - 12) // 超过12张的为付费图片

    return {
      userId,
      totalImagesGenerated: totalImages,
      freeImagesUsed,
      paidImagesUsed,
      lastPaymentDate: paymentRecord?.createdAt,
      isPremiumUser
    }
  } catch (error) {
    console.error('❌ [IMAGE-USAGE] 获取用户图片使用情况失败:', error)
    return {
      userId,
      totalImagesGenerated: 0,
      freeImagesUsed: 0,
      paidImagesUsed: 0,
      isPremiumUser: false
    }
  }
}

/**
 * 检查用户是否可以继续生成图片
 */
export async function canUserGenerateImages(userId: string): Promise<{
  canGenerate: boolean
  remainingFreeImages: number
  needsPayment: boolean
  message: string
}> {
  const usage = await getUserImageUsage(userId)
  
  // 如果用户已付费，检查是否还有付费额度
  if (usage.isPremiumUser) {
    const paidImagesSinceLastPayment = usage.paidImagesUsed % 5
    const remainingPaidImages = 5 - paidImagesSinceLastPayment
    
    if (remainingPaidImages > 0) {
      return {
        canGenerate: true,
        remainingFreeImages: 0,
        needsPayment: false,
        message: `您还有 ${remainingPaidImages} 张付费图片额度`
      }
    } else {
      return {
        canGenerate: false,
        remainingFreeImages: 0,
        needsPayment: true,
        message: '您的付费额度已用完，请购买更多图片额度'
      }
    }
  }
  
  // 免费用户检查
  if (usage.freeImagesUsed < 12) {
    return {
      canGenerate: true,
      remainingFreeImages: 12 - usage.freeImagesUsed,
      needsPayment: false,
      message: `您还有 ${12 - usage.freeImagesUsed} 张免费图片额度`
    }
  } else {
    return {
      canGenerate: false,
      remainingFreeImages: 0,
      needsPayment: true,
      message: '您已用完免费额度，请付费继续使用'
    }
  }
}

/**
 * 记录付费购买
 */
export async function recordPayment(userId: string, amount: number, paymentId: string): Promise<boolean> {
  try {
    await prisma.userPayment.create({
      data: {
        userId,
        amount,
        paymentId,
        status: 'completed',
        imagesPurchased: 5 // 每次购买5张图片
      }
    })
    
    console.log('✅ [PAYMENT] 付费记录已保存:', { userId, amount, paymentId })
    return true
  } catch (error) {
    console.error('❌ [PAYMENT] 保存付费记录失败:', error)
    return false
  }
}
