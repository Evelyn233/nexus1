import { PrismaClient } from '@prisma/client'

// PrismaClient 单例模式，避免开发环境下创建多个实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaBeforeExitRegistered?: boolean
}

// 检查 DATABASE_URL 是否已设置
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ [PRISMA] DATABASE_URL 未设置，数据库操作可能会失败')
  console.warn('💡 [PRISMA] 提示：请确保 DATABASE_URL 在环境变量或 next.config.js 中已配置')
} else {
  console.log('✅ [PRISMA] DATABASE_URL 已设置')
}

/**
 * Neon 等云端 Postgres：补全 sslmode；若使用 pooler 地址则加 pgbouncer=true；限制连接数避免 P2024 连接池耗尽。
 * 请使用 Neon 控制台里的「Pooled connection」连接串（主机名带 -pooler），不要用 Direct。
 */
function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url
  if (!url.includes('neon.tech')) return url
  let out = url
  if (!/[?&]sslmode=/.test(out)) {
    out = out.includes('?') ? `${out}&sslmode=require` : `${out}?sslmode=require`
  }
  // 使用 Neon 连接池时，告诉 Prisma 走 PgBouncer，减少 "Error kind: Closed"
  if (out.includes('-pooler') && !/[?&]pgbouncer=/.test(out)) {
    out = out.includes('?') ? `${out}&pgbouncer=true` : `${out}?pgbouncer=true`
  }
  // Neon 免费版连接数很少，用 3 降低 P2024（连接池超时）概率
  out = out.replace(/([?&])connection_limit=\d+/g, '$1connection_limit=3')
  if (!/[?&]connection_limit=/.test(out)) {
    out = out.includes('?') ? `${out}&connection_limit=3` : `${out}?connection_limit=3`
  }
  // 统一拉长连接超时：Neon 休眠唤醒要几秒，避免 P1001；Closed 错误常因空闲超时
  out = out.replace(/([?&])connect_timeout=\d+/g, '$1connect_timeout=30')
  if (!/[?&]connect_timeout=/.test(out)) {
    out = out.includes('?') ? `${out}&connect_timeout=30` : `${out}?connect_timeout=30`
  }
  // 拉长 pool_timeout，避免并发时 P2024「Timed out fetching a new connection」
  out = out.replace(/([?&])pool_timeout=\d+/g, '$1pool_timeout=25')
  if (!/[?&]pool_timeout=/.test(out)) {
    out = out.includes('?') ? `${out}&pool_timeout=25` : `${out}?pool_timeout=25`
  }
  if (url.includes('neon.tech') && !url.includes('-pooler')) {
    console.warn('⚠️ [PRISMA] 建议使用 Neon 的 Pooled 连接串（主机名带 -pooler），可减少连接被关闭报错。控制台 → Connection details → Pooled connection')
  }
  return out
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL)

// 🔥 创建 Prisma Client 实例，配置连接池和重试机制
// 开发环境仅 log warn：Neon 的 "Error kind: Closed" 来自连接空闲被关闭，会刷屏，withRetry 已处理重试
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn'] : [],
  errorFormat: 'minimal',
  datasources: {
    db: {
      url: databaseUrl ?? process.env.DATABASE_URL,
    },
  },
})

// 🔥 包装 Prisma 查询，自动处理连接错误和重试
export async function withRetry<T>(
  query: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect()
      return await query()
    } catch (error: any) {
      lastError = error
      
      // 检查是否是连接/池错误（含 P2024 连接池超时、P1017 连接已关闭、Neon 的 kind: Closed）
      const errStr = String(error?.message ?? error ?? '')
      const isConnectionError = 
        error?.code === 'P1001' ||
        error?.code === 'P1017' ||
        error?.code === 'P2024' ||
        errStr.includes('Closed') ||
        errStr.includes('kind: Closed') ||
        errStr.includes("Can't reach database server") ||
        errStr.includes('数据库连接失败') ||
        errStr.includes('connection pool') ||
        errStr.includes('unexpected eof') ||
        errStr.includes('Engine is not yet connected')
      
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

// 单例必须始终挂到 global，避免热更新/多实例重复创建连接
globalForPrisma.prisma = prisma

// 添加连接健康检查（仅在开发环境，且只执行一次，避免 HMR 重复建连导致连接池耗尽）
const globalForPrismaHealth = globalThis as unknown as { prismaHealthCheckDone?: boolean }
if (process.env.NODE_ENV !== 'production' && !globalForPrismaHealth.prismaHealthCheckDone) {
  globalForPrismaHealth.prismaHealthCheckDone = true
  setTimeout(async () => {
    try {
      await prisma.$connect()
      const count = await prisma.user.count()
      console.log(`✅ [PRISMA] 数据库连接正常，当前有 ${count} 个用户`)
    } catch (error: any) {
      console.error('❌ [PRISMA] 数据库连接失败:', error.message)
      const dbUrl = process.env.DATABASE_URL
      console.error('🔍 [PRISMA] DATABASE_URL:', dbUrl ? `${dbUrl.substring(0, 30)}...` : '未设置')
      console.error('💡 [PRISMA] 提示：')
      console.error('  1. Neon 免费版会休眠：打开 https://console.neon.tech 进入 inflow_db 项目即可唤醒')
      console.error('  2. 检查网络/VPN，确保能访问 *.neon.tech')
      console.error('  3. 使用 Pooled 连接串（主机名带 -pooler），URL 需含 ?sslmode=require')
    }
  }, 100) // 延迟 100ms 建立连接，减少首请求 "Engine is not yet connected"
}

// 优雅关闭连接（应用退出时）；只注册一次，避免 Next 开发模式 HMR 重复注册导致 MaxListenersExceededWarning
if (typeof window === 'undefined' && !globalForPrisma.prismaBeforeExitRegistered) {
  globalForPrisma.prismaBeforeExitRegistered = true
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

export default prisma

