const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

async function resetPassword() {
  const prisma = new PrismaClient();
  
  try {
    // 生成新密码的哈希
    const hashedPassword = await bcrypt.hash('123456', 12);
    console.log('生成的密码哈希:', hashedPassword);
    
    // 更新用户密码
    const result = await prisma.user.update({
      where: { email: '595674464@qq.com' },
      data: { password: hashedPassword }
    });
    
    console.log('✅ 密码更新成功:', result.email);
    console.log('新密码: 123456');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
