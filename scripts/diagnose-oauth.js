// 诊断和修复 OAuth 问题
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnoseOAuth() {
  console.log('🔍 开始诊断 OAuth 问题...\n')

  try {
    // 1. 检查用户和账户
    const users = await prisma.user.findMany({
      include: { accounts: true }
    })
    
    console.log(`📊 数据库状态:`)
    console.log(`   用户总数: ${users.length}`)
    
    for (const user of users) {
      console.log(`\n   用户: ${user.email || user.phone}`)
      console.log(`   - ID: ${user.id}`)
      console.log(`   - 账户数量: ${user.accounts.length}`)
      for (const account of user.accounts) {
        console.log(`   - Provider: ${account.provider} (${account.providerAccountId})`)
      }
    }

    // 2. 检查是否有孤立账户
    const orphanedAccounts = await prisma.account.findMany({
      where: {
        userId: { notIn: users.map(u => u.id) }
      }
    })
    
    if (orphanedAccounts.length > 0) {
      console.log(`\n⚠️ 发现孤立账户: ${orphanedAccounts.length} 个`)
      for (const acc of orphanedAccounts) {
        console.log(`   - ${acc.provider}: ${acc.providerAccountId}`)
      }
    }

    // 3. 检查是否有用户没有账户
    const usersWithoutAccounts = users.filter(u => u.accounts.length === 0)
    if (usersWithoutAccounts.length > 0) {
      console.log(`\n⚠️ 发现没有账户关联的用户:`)
      for (const user of usersWithoutAccounts) {
        console.log(`   - ${user.email || user.phone} (ID: ${user.id})`)
      }
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseOAuth()
