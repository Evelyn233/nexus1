// 查询用户数量
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  console.log('🔍 正在检查数据库用户...')
  
  try {
    const userCount = await prisma.user.count()
    const accountCount = await prisma.account.count()
    const sessionCount = await prisma.session.count()
    
    console.log(`\n📊 数据库统计：`)
    console.log(`   用户数: ${userCount}`)
    console.log(`   账户数: ${accountCount}`)
    console.log(`   会话数: ${sessionCount}`)
    
    if (userCount === 0) {
      console.log('\n✅ 数据库是空的，可以直接开始！')
    } else {
      console.log('\n⚠️ 数据库里有数据，需要清空！')
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
