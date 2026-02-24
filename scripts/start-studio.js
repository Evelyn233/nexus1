// 启动 Prisma Studio 并加载环境变量
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// 加载环境变量
// 1. 从 next.config.js 读取
const nextConfigPath = path.join(__dirname, '..', 'next.config.js')
if (fs.existsSync(nextConfigPath)) {
  const configContent = fs.readFileSync(nextConfigPath, 'utf8')
  const dbUrlMatch = configContent.match(/DATABASE_URL:\s*["']([^"']+)["']/)
  if (dbUrlMatch) {
    process.env.DATABASE_URL = dbUrlMatch[1]
    console.log('✅ 从 next.config.js 加载了 DATABASE_URL')
  }
}

// 2. 从 .env.local 加载（如果可用）
if (!process.env.DATABASE_URL) {
  try {
    const dotenv = require('dotenv')
    dotenv.config({ path: '.env.local' })
    dotenv.config()
    if (process.env.DATABASE_URL) {
      console.log('✅ 从 .env.local 加载了环境变量')
    }
  } catch (e) {
    // dotenv 不可用，继续
  }
}

// 检查 DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ 未找到 DATABASE_URL 环境变量')
  console.error('💡 请确保:')
  console.error('   1. next.config.js 中有 DATABASE_URL 配置')
  console.error('   2. 或者 .env.local 文件中有 DATABASE_URL')
  process.exit(1)
}

console.log('🚀 启动 Prisma Studio...')
console.log('📊 数据库连接:', process.env.DATABASE_URL.substring(0, 30) + '...')

// 启动 Prisma Studio
const studio = spawn('npx', ['prisma', 'studio'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    DATABASE_URL: process.env.DATABASE_URL
  }
})

studio.on('error', (error) => {
  console.error('❌ 启动失败:', error.message)
  process.exit(1)
})

studio.on('exit', (code) => {
  process.exit(code || 0)
})


