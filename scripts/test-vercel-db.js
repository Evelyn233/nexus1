// 测试 Vercel 上的数据库连接
const { PrismaClient } = require('@prisma/client')

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...')
  
  const prisma = new PrismaClient()
  
  try {
    // 测试连接
    await prisma.$connect()
    console.log('✅ 数据库连接成功')
    
    // 测试查询用户
    const userCount = await prisma.user.count()
    console.log(`📊 用户数量: ${userCount}`)
    
    // 测试查询特定用户
    const testUser = await prisma.user.findUnique({
      where: { email: '595674464@qq.com' }
    })
    
    if (testUser) {
      console.log('✅ 测试用户存在:', {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        hasPassword: !!testUser.password
      })
    } else {
      console.log('❌ 测试用户不存在')
    }
    
  } catch (error) {
    console.error('❌ 数据库连接失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection()
