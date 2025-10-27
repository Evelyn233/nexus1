const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🔧 创建管理员用户...')
    
    // 创建管理员用户
    const adminUser = await prisma.user.upsert({
      where: { email: '595674464@qq.com' },
      update: {
        name: 'Evelyn',
        email: '595674464@qq.com',
        gender: 'female',
        birthDate: JSON.stringify({ year: '1998', month: '1', day: '1', hour: '12' }),
        age: 26,
        height: '165',
        weight: '50',
        location: '上海',
        personality: 'creative, thoughtful, independent',
        hairLength: 'long'
      },
      create: {
        name: 'Evelyn',
        email: '595674464@qq.com',
        gender: 'female',
        birthDate: JSON.stringify({ year: '1998', month: '1', day: '1', hour: '12' }),
        age: 26,
        height: '165',
        weight: '50',
        location: '上海',
        personality: 'creative, thoughtful, independent',
        hairLength: 'long'
      }
    })
    
    console.log('✅ 管理员用户创建成功:', adminUser.email)
    
    // 创建用户钱包（无限额度）
    const wallet = await prisma.userWallet.upsert({
      where: { userId: adminUser.id },
      update: {
        balance: 999999,
        totalEarned: 999999,
        totalSpent: 0
      },
      create: {
        userId: adminUser.id,
        balance: 999999,
        totalEarned: 999999,
        totalSpent: 0
      }
    })
    
    console.log('✅ 管理员钱包创建成功，余额:', wallet.balance)
    
    // 创建用户元数据
    const metadata = await prisma.userMetadata.upsert({
      where: { userId: adminUser.id },
      update: {
        zodiacSign: 'Capricorn',
        chineseZodiac: 'Tiger',
        coreTraits: JSON.stringify(['creative', 'thoughtful', 'independent']),
        communicationStyle: JSON.stringify(['direct', 'analytical']),
        emotionalPattern: JSON.stringify(['introspective', 'sensitive']),
        aestheticPreferences: JSON.stringify(['minimalist', 'modern', 'artistic']),
        lifestyleHobbies: JSON.stringify(['reading', 'art', 'design']),
        fashionStyle: JSON.stringify(['minimalist', 'elegant', 'comfortable']),
        frequentLocations: JSON.stringify(['cafes', 'bookstores', 'art galleries']),
        favoriteVenues: JSON.stringify(['coffee shops', 'libraries', 'museums'])
      },
      create: {
        userId: adminUser.id,
        zodiacSign: 'Capricorn',
        chineseZodiac: 'Tiger',
        coreTraits: JSON.stringify(['creative', 'thoughtful', 'independent']),
        communicationStyle: JSON.stringify(['direct', 'analytical']),
        emotionalPattern: JSON.stringify(['introspective', 'sensitive']),
        aestheticPreferences: JSON.stringify(['minimalist', 'modern', 'artistic']),
        lifestyleHobbies: JSON.stringify(['reading', 'art', 'design']),
        fashionStyle: JSON.stringify(['minimalist', 'elegant', 'comfortable']),
        frequentLocations: JSON.stringify(['cafes', 'bookstores', 'art galleries']),
        favoriteVenues: JSON.stringify(['coffee shops', 'libraries', 'museums'])
      }
    })
    
    console.log('✅ 管理员元数据创建成功')
    
    console.log('🎉 管理员用户设置完成！')
    console.log('📧 邮箱: 595674464@qq.com')
    console.log('💰 钱包余额: 999999')
    console.log('🎨 用户类型: 管理员（无限生图额度）')
    
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
