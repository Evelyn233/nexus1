// 清空数据库脚本 - 在本地运行
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function truncate() {
  console.log('⚠️ 即将清空数据库中的用户相关表...')
  
  try {
    // 删除所有用户关联的 account
    await prisma.account.deleteMany({})
    console.log('✅ 已删除所有 account 记录')
    
    // 删除所有 session
    await prisma.session.deleteMany({})
    console.log('✅ 已删除所有 session 记录')
    
    // 删除所有用户
    await prisma.user.deleteMany({})
    console.log('✅ 已删除所有 user 记录')
    
    // 删除所有 verification token
    try {
      await prisma.verificationToken.deleteMany({})
      console.log('✅ 已删除所有 verification token')
    } catch (e) {
      // 忽略，如果表不存在
    }
    
    console.log('\n🎉 数据库已清空！现在可以重新开始。')
    
  } catch (error) {
    console.error('❌ 清空失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

truncate()
