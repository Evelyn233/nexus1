const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setAdminPassword() {
  try {
    console.log('🔧 为管理员用户设置密码...')
    
    // 生成密码哈希
    const password = '123456' // 设置密码为 123456
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // 更新用户密码
    const updatedUser = await prisma.user.update({
      where: { email: '595674464@qq.com' },
      data: { password: hashedPassword }
    })
    
    console.log('✅ 管理员密码设置成功！')
    console.log('📧 邮箱:', updatedUser.email)
    console.log('🔑 密码: 123456')
    console.log('💡 现在可以使用 595674464@qq.com / 123456 登录')
    
  } catch (error) {
    console.error('❌ 设置管理员密码失败:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

setAdminPassword()
