import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 检查环境变量
    const envVars = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      SEEDREAM_API_KEY: !!process.env.SEEDREAM_API_KEY,
    }

    // 检查数据库连接
    let databaseStatus = 'unknown'
    try {
      const { PrismaClient } = await import('@prisma/client')
      const prisma = new PrismaClient()
      
      // 尝试查询用户表
      await prisma.user.findFirst()
      databaseStatus = 'connected'
      await prisma.$disconnect()
    } catch (error) {
      databaseStatus = 'error'
      console.error('Database check failed:', error)
    }

    // 检查 NextAuth 配置
    const nextAuthStatus = !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET)

    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        environment: envVars,
        database: databaseStatus,
        nextAuth: nextAuthStatus,
      },
      version: '1.0.0'
    }

    return NextResponse.json(healthCheck)
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
