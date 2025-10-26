import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface UserImageUsage {
  userId: string
  dailyFreeUsed: number
  dailyFreeLimit: number
  walletBalance: number
  canGenerateFree: boolean
  canGeneratePaid: boolean
  isNewUser: boolean
  totalImagesGenerated: number
}

export interface DailyQuotaInfo {
  date: string
  freeImagesUsed: number
  freeImagesLimit: number
  isNewUser: boolean
}

/**
 * 获取用户今日免费额度信息
 */
export async function getUserDailyQuota(userId: string): Promise<DailyQuotaInfo> {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // 设置为今天的开始
  
  // 检查用户是否为注册7天内的新用户
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true }
  })
  
  if (!user) {
    throw new Error('用户不存在')
  }
  
  const isNewUser = (Date.now() - user.createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000) // 7天
  const freeLimit = isNewUser ? 9 : 3 // 新用户9张，老用户3张
  
  // 获取今日额度记录
  let dailyQuota = await prisma.userDailyQuota.findUnique({
    where: {
      userId_date: {
        userId,
        date: today
      }
    }
  })
  
  // 如果没有今日记录，创建一个
  if (!dailyQuota) {
    dailyQuota = await prisma.userDailyQuota.create({
      data: {
        userId,
        date: today,
        freeImagesUsed: 0,
        isNewUser
      }
    })
  }
  
  return {
    date: today.toISOString().split('T')[0],
    freeImagesUsed: dailyQuota.freeImagesUsed,
    freeImagesLimit: freeLimit,
    isNewUser
  }
}

/**
 * 获取用户钱包余额
 */
export async function getUserWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.userWallet.findUnique({
    where: { userId }
  })
  
  return wallet?.balance || 0
}

/**
 * 获取用户图片使用情况
 */
export async function getUserImageUsage(userEmail: string): Promise<UserImageUsage> {
  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      wallet: true,
      generatedContents: {
        select: { imageCount: true }
      }
    }
  })
  
  if (!user) {
    throw new Error('用户不存在')
  }
  
  // 管理员特殊处理
  if (userEmail === '595674464@qq.com') {
    return {
      userId: user.id,
      dailyFreeUsed: 0,
      dailyFreeLimit: 999999,
      walletBalance: 999999,
      canGenerateFree: true,
      canGeneratePaid: true,
      isNewUser: false,
      totalImagesGenerated: 0
    }
  }
  
  // 获取今日免费额度
  const dailyQuota = await getUserDailyQuota(user.id)
  const walletBalance = await getUserWalletBalance(user.id)
  
  // 计算总生成图片数
  const totalImagesGenerated = user.generatedContents.reduce(
    (sum, content) => sum + content.imageCount, 
    0
  )
  
  return {
    userId: user.id,
    dailyFreeUsed: dailyQuota.freeImagesUsed,
    dailyFreeLimit: dailyQuota.freeImagesLimit,
    walletBalance,
    canGenerateFree: dailyQuota.freeImagesUsed < dailyQuota.freeImagesLimit,
    canGeneratePaid: walletBalance >= 0.5, // 假设每张图片0.5美元
    isNewUser: dailyQuota.isNewUser,
    totalImagesGenerated
  }
}

/**
 * 检查用户是否可以生成图片
 */
export async function canUserGenerateImages(userEmail: string): Promise<boolean> {
  const usage = await getUserImageUsage(userEmail)
  return usage.canGenerateFree || usage.canGeneratePaid
}

/**
 * 记录图片生成使用
 */
export async function recordImageGeneration(userId: string, imageCount: number = 1): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // 更新今日免费额度使用
  await prisma.userDailyQuota.upsert({
    where: {
      userId_date: {
        userId,
        date: today
      }
    },
    update: {
      freeImagesUsed: {
        increment: imageCount
      }
    },
    create: {
      userId,
      date: today,
      freeImagesUsed: imageCount,
      isNewUser: false // 这里可以根据需要调整
    }
  })
}

/**
 * 从钱包扣除费用
 */
export async function deductFromWallet(userId: string, amount: number): Promise<boolean> {
  const wallet = await prisma.userWallet.findUnique({
    where: { userId }
  })
  
  if (!wallet || wallet.balance < amount) {
    return false
  }
  
  await prisma.userWallet.update({
    where: { userId },
    data: {
      balance: {
        decrement: amount
      },
      totalSpent: {
        increment: amount
      }
    }
  })
  
  return true
}

/**
 * 充值到钱包
 */
export async function addToWallet(userId: string, amount: number): Promise<void> {
  await prisma.userWallet.upsert({
    where: { userId },
    update: {
      balance: {
        increment: amount
      },
      totalEarned: {
        increment: amount
      }
    },
    create: {
      userId,
      balance: amount,
      totalEarned: amount,
      totalSpent: 0
    }
  })
}