import { PrismaClient } from '@prisma/client'

// PrismaClient 单例模式，避免开发环境下创建多个实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [],  // 禁用所有Prisma日志
  errorFormat: 'minimal',  // 使用最小化的错误格式
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma

