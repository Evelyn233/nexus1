import { PrismaClient } from '@prisma/client'

// PrismaClient 单例模式，避免开发环境下创建多个实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// 检查 DATABASE_URL 是否已设置
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ [PRISMA] DATABASE_URL 未设置，数据库操作可能会失败')
  console.warn('💡 [PRISMA] 提示：请确保 DATABASE_URL 在环境变量或 next.config.js 中已配置')
} else {
  console.log('✅ [PRISMA] DATABASE_URL 已设置')
}

// 🔥 创建 Prisma Client 实例，配置连接池和重试机制
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
  errorFormat: 'minimal',
  // 🔥 添加连接池配置（针对 Neon 数据库优化）
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// 🔥 包装 Prisma 查询，自动处理连接错误和重试
export async function withRetry<T>(
  query: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await query()
    } catch (error: any) {
      lastError = error
      
      // 检查是否是连接错误
      const isConnectionError = 
        error.code === 'P1001' ||
        error.message?.includes('Closed') ||
        error.message?.includes("Can't reach database server") ||
        error.message?.includes('数据库连接失败')
      
      // 如果不是连接错误，或者已经重试过，直接抛出
      if (!isConnectionError || attempt >= maxRetries) {
        throw error
      }
      
      // 尝试重新连接
      console.warn(`⚠️ [PRISMA] 检测到连接错误，尝试重新连接 (尝试 ${attempt + 1}/${maxRetries + 1})...`)
      try {
        await prisma.$disconnect().catch(() => {}) // 忽略断开错误
        await new Promise(resolve => setTimeout(resolve, 500)) // 等待500ms
        await prisma.$connect()
        console.log('✅ [PRISMA] 重新连接成功，重试查询...')
      } catch (reconnectError: any) {
        console.error('❌ [PRISMA] 重新连接失败:', reconnectError.message)
        throw reconnectError
      }
    }
  }
  
  throw lastError
}

// 添加连接健康检查（仅在开发环境）
if (process.env.NODE_ENV !== 'production') {
  // 开发环境下，异步测试连接（不阻塞启动）
  setTimeout(async () => {
    try {
      // 直接测试连接，不使用 ensureConnection（避免栈溢出）
      await prisma.$connect()
      const count = await prisma.user.count()
      console.log(`✅ [PRISMA] 数据库连接正常，当前有 ${count} 个用户`)
    } catch (error: any) {
      console.error('❌ [PRISMA] 数据库连接失败:', error.message)
      const dbUrl = process.env.DATABASE_URL
      console.error('🔍 [PRISMA] DATABASE_URL:', dbUrl ? `${dbUrl.substring(0, 30)}...` : '未设置')
      console.error('💡 [PRISMA] 提示：')
      console.error('  1. 检查 Neon 数据库是否正常运行')
      console.error('  2. 检查网络连接')
      console.error('  3. 检查 DATABASE_URL 是否正确（特别是连接池参数）')
      console.error('  4. 如果使用了连接池（pooler），确保 URL 中包含 ?sslmode=require')
    }
  }, 1000) // 延迟1秒，避免阻塞应用启动

  globalForPrisma.prisma = prisma
}

// 🔥 优雅关闭连接（应用退出时）
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma

