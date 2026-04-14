// 修复所有用户的 userType 为 project
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixUserTypes() {
  console.log('🔧 开始修复用户类型...\n')

  try {
    // 1. 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        phone: true,
        profileData: true
      }
    })

    console.log(`📊 找到 ${users.length} 个用户`)

    let updated = 0
    for (const user of users) {
      let needsUpdate = false
      let profileData = {}

      // 解析现有的 profileData
      if (user.profileData) {
        try {
          profileData = typeof user.profileData === 'string'
            ? JSON.parse(user.profileData)
            : user.profileData
        } catch (_) {
          profileData = {}
        }
      }

      // 检查并更新 userType
      if (!profileData.userType || profileData.userType !== 'project') {
        profileData.userType = 'project'
        needsUpdate = true
      }

      if (needsUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { profileData: JSON.stringify(profileData) }
        })
        updated++
        console.log(`   ✅ 已更新: ${user.email || user.phone}`)
      } else {
        console.log(`   ✓ 已正确: ${user.email || user.phone}`)
      }
    }

    console.log(`\n✨ 完成！更新了 ${updated} 个用户的类型`)

  } catch (error) {
    console.error('❌ 修复失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserTypes()
