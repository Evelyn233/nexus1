/**
 * Prisma 数据库连接健康检查服务
 * 用于诊断和修复连接问题
 */

import prisma from './prisma'

export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message: string
  details?: any
}

/**
 * 检查数据库连接健康状态
 */
export async function checkDatabaseHealth(): Promise<ConnectionHealth> {
  try {
    // 测试1: 基础连接
    await prisma.$connect()
    
    // 测试2: 简单查询
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    // 测试3: 获取用户数量（实际查询）
    const userCount = await prisma.user.count()
    
    return {
      status: 'healthy',
      message: `数据库连接正常，当前有 ${userCount} 个用户`,
      details: {
        connectionTest: 'passed',
        queryTest: 'passed',
        userCount
      }
    }
  } catch (error: any) {
    // 分析错误类型
    if (error.code === 'P1001' || error.message?.includes('Closed')) {
      // 连接关闭错误
      try {
        // 尝试重新连接
        await prisma.$disconnect()
        await prisma.$connect()
        
        // 再次测试
        const userCount = await prisma.user.count()
        
        return {
          status: 'degraded',
          message: `连接已恢复，当前有 ${userCount} 个用户`,
          details: {
            error: error.message,
            recovered: true
          }
        }
      } catch (reconnectError: any) {
        return {
          status: 'unhealthy',
          message: `连接失败：${reconnectError.message}`,
          details: {
            originalError: error.message,
            reconnectError: reconnectError.message,
            suggestion: '请检查 DATABASE_URL 和网络连接'
          }
        }
      }
    }
    
    // 其他错误
    return {
      status: 'unhealthy',
      message: `数据库错误：${error.message}`,
      details: {
        error: error.message,
        code: error.code,
        suggestion: '请查看错误详情并检查数据库配置'
      }
    }
  }
}

/**
 * 自动修复连接（如果需要）
 */
export async function autoFixConnection(): Promise<boolean> {
  try {
    // 断开现有连接
    await prisma.$disconnect().catch(() => {
      // 忽略断开错误
    })
    
    // 等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 重新连接
    await prisma.$connect()
    
    // 验证连接
    await prisma.$queryRaw`SELECT 1`
    
    return true
  } catch (error) {
    console.error('❌ [PRISMA-HEALTH] 自动修复失败:', error)
    return false
  }
}














