// 加载环境变量 - 支持本地和生产环境
const fs = require('fs')
const path = require('path')

// 检查命令行参数
const args = process.argv.slice(2)
const useProduction = args.includes('--prod') || args.includes('--production')
const dbUrlArg = args.find(arg => arg.startsWith('--db-url='))

if (dbUrlArg) {
  // 从命令行参数读取数据库 URL
  process.env.DATABASE_URL = dbUrlArg.split('=')[1]
  console.log('✅ 使用命令行指定的数据库 URL')
} else if (useProduction) {
  // 使用生产环境数据库（从 vercel.json）
  const vercelConfigPath = path.join(__dirname, '..', 'vercel.json')
  if (fs.existsSync(vercelConfigPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))
    if (vercelConfig.env?.DATABASE_URL) {
      process.env.DATABASE_URL = vercelConfig.env.DATABASE_URL
      console.log('✅ 使用生产环境数据库 (vercel.json)')
    }
  }
} else {
  // 默认：从 next.config.js 读取（本地开发环境）
  const nextConfigPath = path.join(__dirname, '..', 'next.config.js')
  if (fs.existsSync(nextConfigPath)) {
    const configContent = fs.readFileSync(nextConfigPath, 'utf8')
    const dbUrlMatch = configContent.match(/DATABASE_URL:\s*["']([^"']+)["']/)
    if (dbUrlMatch) {
      process.env.DATABASE_URL = dbUrlMatch[1]
      console.log('✅ 使用本地开发数据库 (next.config.js)')
    }
  }
  
  // 如果还是没有，尝试从 dotenv 加载（优先 .env.local）
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
}

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// 格式化日期
function formatDate(date) {
  if (!date) return '未设置'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化生日
function formatBirthDate(birthDate) {
  if (!birthDate) return '未设置'
  try {
    const birth = JSON.parse(birthDate)
    return `${birth.year}-${String(birth.month).padStart(2, '0')}-${String(birth.day).padStart(2, '0')}`
  } catch {
    return birthDate
  }
}

// 解析 JSON 字段
function parseJsonField(field) {
  if (!field) return null
  try {
    return JSON.parse(field)
  } catch {
    return field
  }
}

async function listUsers() {
  try {
    console.log('🔍 正在查询用户数据...\n')
    
    // 先检查总用户数（不包含任何关联）
    const totalCount = await prisma.user.count()
    console.log(`📊 数据库中的总用户数: ${totalCount}\n`)
    
    // 获取所有用户
    const users = await prisma.user.findMany({
      include: {
        metadata: true,
        wallet: true,
        _count: {
          select: {
            chatSessions: true,
            generatedContents: true,
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ 找到 ${users.length} 个用户\n`)
    console.log('='.repeat(100))
    
    if (users.length === 0) {
      console.log('📭 数据库中没有用户')
      return
    }

    // 显示用户列表
    users.forEach((user, index) => {
      console.log(`\n📌 用户 #${index + 1}`)
      console.log('-'.repeat(100))
      
      // 基本信息
      console.log(`  ID:        ${user.id}`)
      console.log(`  姓名:      ${user.name || '未设置'}`)
      console.log(`  邮箱:      ${user.email || '未设置'}`)
      console.log(`  手机:      ${user.phone || '未设置'}`)
      console.log(`  性别:      ${user.gender === 'female' ? '女' : user.gender === 'male' ? '男' : '未设置'}`)
      console.log(`  年龄:      ${user.age || '未设置'}`)
      console.log(`  生日:      ${formatBirthDate(user.birthDate)}`)
      console.log(`  身高:      ${user.height || '未设置'}${user.height ? 'cm' : ''}`)
      console.log(`  体重:      ${user.weight || '未设置'}${user.weight ? 'kg' : ''}`)
      console.log(`  地点:      ${user.location || '未设置'}`)
      console.log(`  性格:      ${user.personality || '未设置'}`)
      console.log(`  头发:      ${user.hairLength || '未设置'}`)
      
      // 统计数据
      console.log(`\n  📊 统计数据:`)
      console.log(`     对话数:      ${user._count.chatSessions}`)
      console.log(`     内容数:      ${user._count.generatedContents}`)
      console.log(`     付费记录:    ${user._count.payments}`)
      
      // 钱包信息
      if (user.wallet) {
        console.log(`\n  💰 钱包信息:`)
        console.log(`     余额:       $${user.wallet.balance.toFixed(2)}`)
        console.log(`     总充值:     $${user.wallet.totalEarned.toFixed(2)}`)
        console.log(`     总消费:     $${user.wallet.totalSpent.toFixed(2)}`)
      }
      
      // 元数据信息
      if (user.metadata) {
        console.log(`\n  🎨 元数据信息:`)
        console.log(`     星座:       ${user.metadata.zodiacSign || '未设置'}`)
        console.log(`     生肖:       ${user.metadata.chineseZodiac || '未设置'}`)
        
        const coreTraits = parseJsonField(user.metadata.coreTraits)
        if (coreTraits && Array.isArray(coreTraits) && coreTraits.length > 0) {
          console.log(`     核心特质:   ${coreTraits.slice(0, 5).join(', ')}${coreTraits.length > 5 ? '...' : ''}`)
        }
        
        const frequentLocations = parseJsonField(user.metadata.frequentLocations)
        if (frequentLocations && Array.isArray(frequentLocations) && frequentLocations.length > 0) {
          console.log(`     常去地点:   ${frequentLocations.slice(0, 5).join(', ')}${frequentLocations.length > 5 ? '...' : ''}`)
        }
        
        console.log(`     更新次数:   ${user.metadata.updateCount || 0}`)
        console.log(`     最后分析:   ${formatDate(user.metadata.lastAnalyzed)}`)
      } else {
        console.log(`\n  🎨 元数据:    无`)
      }
      
      // 时间信息
      console.log(`\n  ⏰ 时间信息:`)
      console.log(`     创建时间:   ${formatDate(user.createdAt)}`)
      console.log(`     更新时间:   ${formatDate(user.updatedAt)}`)
    })

    // 统计汇总
    console.log('\n' + '='.repeat(100))
    console.log('\n📊 统计汇总:')
    console.log(`  总用户数:           ${users.length}`)
    console.log(`  有邮箱用户:        ${users.filter(u => u.email).length}`)
    console.log(`  有手机号用户:       ${users.filter(u => u.phone).length}`)
    console.log(`  有完整信息用户:     ${users.filter(u => u.gender && u.birthDate).length}`)
    console.log(`  有元数据用户:      ${users.filter(u => u.metadata).length}`)
    console.log(`  有钱包用户:        ${users.filter(u => u.wallet).length}`)
    
    const totalChats = users.reduce((sum, u) => sum + u._count.chatSessions, 0)
    const totalContents = users.reduce((sum, u) => sum + u._count.generatedContents, 0)
    const totalBalance = users.reduce((sum, u) => sum + (u.wallet?.balance || 0), 0)
    
    console.log(`  总对话数:          ${totalChats}`)
    console.log(`  总内容数:          ${totalContents}`)
    console.log(`  总钱包余额:        $${totalBalance.toFixed(2)}`)
    
  } catch (error) {
    console.error('❌ 查询用户失败:', error.message)
    
    // 检查是否是环境变量问题
    if (error.message?.includes('Environment variable not found: DATABASE_URL') ||
        error.message?.includes('DATABASE_URL')) {
      console.error('\n💡 提示: DATABASE_URL 环境变量未设置')
      console.error('\n解决方法:')
      console.error('  1. 创建 .env.local 文件（如果不存在）')
      console.error('  2. 在文件中添加: DATABASE_URL="你的数据库连接字符串"')
      console.error('  3. 或者设置系统环境变量:')
      console.error('     Windows PowerShell: $env:DATABASE_URL="你的数据库连接字符串"')
      console.error('     Windows CMD: set DATABASE_URL=你的数据库连接字符串')
      console.error('     Linux/Mac: export DATABASE_URL="你的数据库连接字符串"')
      console.error('\n  4. 安装 dotenv 包（可选，用于自动加载 .env 文件）:')
      console.error('     npm install dotenv')
    } else if (error.message?.includes('Can\'t reach database server') || 
               error.message?.includes('P1001')) {
      console.error('\n💡 提示: 数据库连接失败，请检查:')
      console.error('  1. DATABASE_URL 环境变量是否正确')
      console.error('  2. 数据库服务器是否正常运行')
      console.error('  3. 网络连接是否正常')
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 支持命令行参数（移除已处理的参数）
const filteredArgs = args.filter(arg => 
  !arg.startsWith('--db-url=') && 
  arg !== '--prod' && 
  arg !== '--production'
)
const command = filteredArgs[0]

if (command === '--help' || command === '-h') {
  console.log(`
📋 用户列表查询工具

用法:
  node scripts/list-users.js [选项]

选项:
  --help, -h          显示帮助信息
  --simple, -s        简单模式（只显示基本信息）
  --json, -j           JSON 格式输出
  --prod, --production 使用生产环境数据库（从 vercel.json）
  --db-url=URL         指定数据库连接字符串

示例:
  node scripts/list-users.js              # 显示完整用户列表（本地数据库）
  node scripts/list-users.js --prod       # 查询生产环境用户
  node scripts/list-users.js --simple     # 简单模式
  node scripts/list-users.js --json       # JSON 输出
  node scripts/list-users.js --prod --simple  # 生产环境简单模式
`)
  process.exit(0)
}

if (command === '--simple' || command === '-s') {
  // 简单模式
  (async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          gender: true,
          age: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(`\n找到 ${users.length} 个用户:\n`)
      users.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name || '未设置姓名'} (${user.email || user.phone || '无联系方式'})`)
        console.log(`   性别: ${user.gender || '未设置'} | 年龄: ${user.age || '未设置'} | 创建: ${formatDate(user.createdAt)}`)
      })
      
      await prisma.$disconnect()
    } catch (err) {
      console.error('❌ 查询失败:', err.message)
      if (err.message?.includes('Environment variable not found: DATABASE_URL')) {
        console.error('\n💡 请设置 DATABASE_URL 环境变量（见 --help 获取帮助）')
      }
      await prisma.$disconnect()
      process.exit(1)
    }
  })()
} else if (command === '--json' || command === '-j') {
  // JSON 模式
  (async () => {
    try {
      const users = await prisma.user.findMany({
        include: {
          metadata: true,
          wallet: true,
          _count: {
            select: {
              chatSessions: true,
              generatedContents: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(JSON.stringify({
        total: users.length,
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          gender: user.gender,
          age: user.age,
          location: user.location,
          hasMetadata: !!user.metadata,
          hasWallet: !!user.wallet,
          walletBalance: user.wallet?.balance || 0,
          chatSessionsCount: user._count.chatSessions,
          generatedContentsCount: user._count.generatedContents,
          createdAt: user.createdAt
        }))
      }, null, 2))
      
      await prisma.$disconnect()
    } catch (err) {
      console.error('❌ 查询失败:', err.message)
      if (err.message?.includes('Environment variable not found: DATABASE_URL')) {
        console.error('\n💡 请设置 DATABASE_URL 环境变量（见 --help 获取帮助）')
      }
      await prisma.$disconnect()
      process.exit(1)
    }
  })()
} else {
  // 默认完整模式
  listUsers()
}

