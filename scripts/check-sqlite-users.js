// 检查 SQLite 数据库中是否有其他用户
const { PrismaClient } = require('@prisma/client')
const path = require('path')

// 使用 SQLite 数据库
const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${path.join(__dirname, '..', 'prisma', 'dev.db')}`
    }
  }
})

async function checkSqliteUsers() {
  try {
    console.log('🔍 检查 SQLite 数据库 (prisma/dev.db)...\n')
    
    const users = await sqlitePrisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 SQLite 数据库中的用户数: ${users.length}\n`)
    
    if (users.length > 0) {
      console.log('用户列表:')
      users.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name || '未设置姓名'} (${user.email || user.phone || '无联系方式'})`)
        console.log(`   ID: ${user.id}`)
        console.log(`   创建时间: ${new Date(user.createdAt).toLocaleString('zh-CN')}`)
        console.log('')
      })
    } else {
      console.log('❌ SQLite 数据库中没有用户')
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message)
    if (error.message?.includes('does not exist')) {
      console.error('💡 SQLite 数据库文件不存在或已损坏')
    }
  } finally {
    await sqlitePrisma.$disconnect()
  }
}

checkSqliteUsers()


