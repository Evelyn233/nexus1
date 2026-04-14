// 强制清空数据库脚本
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function truncateDatabase() {
  console.log('🗑️  开始清空数据库...')
  
  try {
    // 先删除有外键依赖的表
    console.log('   删除 Account 记录...')
    await prisma.account.deleteMany()
    
    console.log('   删除 Session 记录...')
    await prisma.session.deleteMany()
    
    console.log('   删除 VerificationToken 记录...')
    await prisma.verificationToken.deleteMany()
    
    console.log('   删除 User 记录...')
    await prisma.user.deleteMany()
    
    console.log('✅ 数据库已清空成功!')
    console.log('📝 请重新注册你的账号')
  } catch (error) {
    console.error('❌ 清空数据库失败:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

truncateDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
