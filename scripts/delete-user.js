import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteUser() {
  const email = 'eveline31600@gmail.com';
  
  try {
    // 查找用户
    const user = await prisma.user.findFirst({
      where: { email }
    });
    
    if (!user) {
      console.log('用户不存在:', email);
      return;
    }
    
    console.log('找到用户:', user.id, user.email);
    
    // 删除关联的 accounts
    const deletedAccounts = await prisma.account.deleteMany({
      where: { userId: user.id }
    });
    console.log('已删除 accounts 数量:', deletedAccounts.count);
    
    // 删除用户
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('✅ 用户已删除');
    
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
